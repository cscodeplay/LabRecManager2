'use client';

import React, { useState, useEffect } from 'react';
import {
    Sparkles, ChevronLeft, ChevronRight, Play, Pause, 
    X, Maximize2, Minimize2, GripHorizontal, FileText, 
    Presentation, Plus, Layout, ArrowDown, ArrowUp, RefreshCw,
    CheckCircle2, StickyNote, Image as ImageIcon
} from 'lucide-react';
import toast from 'react-hot-toast';
import { browserAPI } from '@/lib/api';

export default function WhiteboardAISlideShow({
    curtainHeight = 85,
    onCurtainHeightChange,
    onClose,
    onStampSlideToBoard,
    boardContextText = ''
}) {
    const [topic, setTopic] = useState('');
    const [slideCount, setSlideCount] = useState(5);
    const [isGenerating, setIsGenerating] = useState(false);
    
    // Slide deck state
    const [slides, setSlides] = useState([
        {
            id: 1,
            title: 'Welcome to AI Classroom Slide Show',
            subtitle: 'Interactive Visual Lessons Integrated into Whiteboard',
            bullets: [
                'Enter any academic topic or click "Use Board Content" to generate a full presentation',
                'Each slide includes key bullet insights, speaker notes, and AI educational diagrams',
                'One-click "Stamp Slide onto Board" transfers the lesson directly to your active slide',
                'Drag the bottom bar to roll the curtain up or down, revealing notes underneath'
            ],
            diagramUrl: 'https://image.pollinations.ai/prompt/classroom%20interactive%20presentation%20slide%20deck%20science%20diagram?width=700&height=420&nologo=true',
            speakerNotes: 'Introduce the core concept clearly. Ask students what prior knowledge they have before advancing.'
        }
    ]);
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [showSpeakerNotes, setShowSpeakerNotes] = useState(true);

    const activeSlide = slides[currentSlideIndex] || slides[0];

    // Handle slide generation
    const handleGenerateSlides = async (overrideTopic) => {
        const queryTopic = (overrideTopic || topic || (boardContextText ? 'Board Summary Lesson' : '')).trim();
        if (!queryTopic && !boardContextText) {
            toast.error('Please enter a topic or use board content to generate slides');
            return;
        }

        try {
            setIsGenerating(true);
            const res = await browserAPI.generateSlides({
                topic: queryTopic,
                slideCount,
                boardContext: boardContextText
            });

            if (res.data?.success && res.data.data?.slides?.length > 0) {
                setSlides(res.data.data.slides);
                setCurrentSlideIndex(0);
                toast.success(`Generated ${res.data.data.slides.length} slides on "${queryTopic}"!`, { icon: '✨' });
            } else {
                toast.error('Could not generate slides for this topic');
            }
        } catch (err) {
            console.error('Slide generation error:', err);
            toast.error(err.response?.data?.message || 'Failed to generate slides. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };

    // Auto-play timer
    useEffect(() => {
        if (!isPlaying || slides.length <= 1) return;
        const timer = setInterval(() => {
            setCurrentSlideIndex(prev => (prev + 1) % slides.length);
        }, 8000);
        return () => clearInterval(timer);
    }, [isPlaying, slides.length]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.target.closest('input') || e.target.closest('textarea')) return;
            if (e.key === 'ArrowRight') {
                setCurrentSlideIndex(prev => (prev < slides.length - 1 ? prev + 1 : prev));
            } else if (e.key === 'ArrowLeft') {
                setCurrentSlideIndex(prev => (prev > 0 ? prev - 1 : prev));
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [slides.length]);

    // Stamp current slide to board
    const handleStampSlide = () => {
        if (!activeSlide) return;
        onStampSlideToBoard?.(activeSlide);
        toast.success(`Slide "${activeSlide.title}" stamped to whiteboard!`, { icon: '📋' });
    };

    return (
        <div
            className="whiteboard-curtain-container absolute top-0 left-0 right-0 z-40 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 shadow-2xl transition-[height] duration-75 overflow-hidden flex flex-col justify-between select-none text-slate-100 border-b border-indigo-500/30"
            style={{ height: `${curtainHeight}%` }}
            onPointerDown={(e) => e.stopPropagation()}
        >
            {/* Top Toolbar: Generator + Mode Controls */}
            <div className="px-5 py-3 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between gap-4">
                {/* Topic Input Bar */}
                <div className="flex items-center gap-2 flex-1 max-w-2xl">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-400 bg-indigo-950/60 border border-indigo-500/30 px-2.5 py-1.5 rounded-xl shrink-0">
                        <Presentation className="w-4 h-4 text-indigo-400" />
                        <span>AI Slide Show</span>
                    </div>

                    <div className="relative flex-1">
                        <input
                            type="text"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleGenerateSlides()}
                            placeholder="Enter lesson topic (e.g. Photosynthesis, Binary Search, Newton's 3 Laws)..."
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 pr-20"
                        />
                        {boardContextText && (
                            <button
                                onClick={() => handleGenerateSlides(boardContextText.slice(0, 100))}
                                className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-[10px] font-medium transition"
                                title="Generate slides using notes from current board"
                            >
                                Board Context
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-1">
                        <select
                            value={slideCount}
                            onChange={(e) => setSlideCount(parseInt(e.target.value))}
                            className="bg-slate-900 border border-slate-700 text-slate-300 rounded-xl px-2 py-1.5 text-xs focus:outline-none focus:border-indigo-500"
                        >
                            <option value={3}>3 Slides</option>
                            <option value={5}>5 Slides</option>
                            <option value={7}>7 Slides</option>
                        </select>

                        <button
                            onClick={() => handleGenerateSlides()}
                            disabled={isGenerating}
                            className="px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/30 transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                        >
                            {isGenerating ? (
                                <>
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    <span>Generating...</span>
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-3.5 h-3.5" />
                                    <span>Generate Deck</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Curtain Height & Close Buttons */}
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={() => onCurtainHeightChange?.(curtainHeight > 50 ? 25 : 85)}
                        className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition flex items-center gap-1 font-medium"
                        title={curtainHeight > 50 ? 'Roll curtain halfway up' : 'Roll curtain down'}
                    >
                        {curtainHeight > 50 ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
                        <span>{curtainHeight > 50 ? 'Roll Up (Half)' : 'Roll Down (Full)'}</span>
                    </button>

                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-rose-950/80 text-slate-400 hover:text-rose-400 transition"
                        title="Close Curtain & Slide Show"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Slide Body: Visual Presentation Deck */}
            <div className="flex-1 px-8 py-5 overflow-y-auto custom-scrollbar flex items-center justify-center">
                <div className="w-full max-w-5xl bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl relative flex flex-col justify-between min-h-[360px]">
                    {/* Slide Top Details */}
                    <div>
                        <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-3">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-950/80 border border-indigo-500/30 px-3 py-1 rounded-full">
                                Slide {currentSlideIndex + 1} of {slides.length}
                            </span>
                            
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleStampSlide}
                                    className="px-3 py-1 bg-emerald-600/90 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-md transition flex items-center gap-1.5"
                                    title="Stamp this slide's text and diagram directly onto the whiteboard"
                                >
                                    <Layout className="w-3.5 h-3.5" />
                                    <span>Stamp to Whiteboard Page</span>
                                </button>

                                <button
                                    onClick={() => setShowSpeakerNotes(prev => !prev)}
                                    className={`px-2.5 py-1 rounded-xl text-xs transition flex items-center gap-1 ${
                                        showSpeakerNotes ? 'bg-amber-950/60 text-amber-300 border border-amber-500/30' : 'bg-slate-800 text-slate-400'
                                    }`}
                                >
                                    <StickyNote className="w-3 h-3" />
                                    <span>Notes</span>
                                </button>
                            </div>
                        </div>

                        {/* Slide Title & Subtitle */}
                        <h2 className="text-2xl font-extrabold text-white tracking-tight leading-snug mb-1">
                            {activeSlide.title}
                        </h2>
                        {activeSlide.subtitle && (
                            <p className="text-sm font-medium text-slate-400 mb-5">
                                {activeSlide.subtitle}
                            </p>
                        )}
                    </div>

                    {/* Slide Content: Bullets + Diagram Side-by-Side */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 my-2 items-center">
                        {/* Bullets List */}
                        <div className="md:col-span-7 space-y-3">
                            <ul className="space-y-2.5">
                                {(activeSlide.bullets || []).map((bullet, idx) => (
                                    <li key={idx} className="flex items-start gap-3 bg-slate-800/40 p-3 rounded-2xl border border-slate-700/40">
                                        <div className="w-6 h-6 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0 mt-0.5 text-indigo-400 font-bold text-xs">
                                            {idx + 1}
                                        </div>
                                        <span className="text-sm text-slate-200 leading-relaxed font-normal">
                                            {bullet}
                                        </span>
                                    </li>
                                ))}
                            </ul>

                            {/* Speaker Notes */}
                            {showSpeakerNotes && activeSlide.speakerNotes && (
                                <div className="p-3 bg-amber-950/30 border border-amber-500/30 rounded-2xl text-xs text-amber-200 flex items-start gap-2 mt-3">
                                    <StickyNote className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                                    <div>
                                        <span className="font-bold block text-amber-300 mb-0.5">Presenter Lecture Note:</span>
                                        <p className="leading-snug">{activeSlide.speakerNotes}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Diagram / Visual Figure */}
                        <div className="md:col-span-5 flex flex-col items-center justify-center">
                            {activeSlide.diagramUrl ? (
                                <div className="w-full relative rounded-2xl overflow-hidden border border-slate-700 bg-slate-950 shadow-xl group">
                                    <img
                                        src={activeSlide.diagramUrl}
                                        alt={activeSlide.title}
                                        className="w-full h-56 object-cover bg-black/40 group-hover:scale-105 transition-transform duration-300"
                                        crossOrigin="anonymous"
                                    />
                                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950/90 to-transparent p-2.5 text-center">
                                        <span className="text-[11px] text-slate-300 font-medium">
                                            {activeSlide.diagramPrompt || 'Concept Illustration'}
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <div className="w-full h-56 rounded-2xl border border-dashed border-slate-700 flex flex-col items-center justify-center text-slate-500 text-xs">
                                    <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
                                    <span>No diagram attached</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Bottom Navigation & Indicator Bar */}
                    <div className="flex items-center justify-between pt-4 border-t border-slate-800/80 mt-4">
                        <div className="flex items-center gap-1.5">
                            {slides.map((_, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setCurrentSlideIndex(idx)}
                                    className={`h-2 rounded-full transition-all ${
                                        idx === currentSlideIndex 
                                            ? 'w-7 bg-indigo-500' 
                                            : 'w-2 bg-slate-700 hover:bg-slate-500'
                                    }`}
                                    title={`Go to slide ${idx + 1}`}
                                />
                            ))}
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setIsPlaying(prev => !prev)}
                                className={`px-2.5 py-1.5 rounded-xl text-xs font-medium transition flex items-center gap-1 ${
                                    isPlaying ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-300 hover:text-white'
                                }`}
                                title={isPlaying ? 'Pause Auto-Play' : 'Start Auto-Play Presentation'}
                            >
                                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                                <span>{isPlaying ? 'Pause' : 'Auto Play'}</span>
                            </button>

                            <button
                                onClick={() => setCurrentSlideIndex(prev => (prev > 0 ? prev - 1 : prev))}
                                disabled={currentSlideIndex === 0}
                                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40 transition"
                                title="Previous Slide (Left Arrow)"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>

                            <button
                                onClick={() => setCurrentSlideIndex(prev => (prev < slides.length - 1 ? prev + 1 : prev))}
                                disabled={currentSlideIndex === slides.length - 1}
                                className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 transition"
                                title="Next Slide (Right Arrow)"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Grip Handle to Roll Down / Up Curtain */}
            <div
                className="h-8 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-t border-indigo-500/40 flex items-center justify-between px-6 cursor-row-resize select-none"
                onPointerDown={(e) => {
                    if (e.target.closest('button')) return;
                    e.preventDefault();
                    e.stopPropagation();
                    const startY = e.clientY;
                    const startH = curtainHeight;
                    const totalH = window.innerHeight || 800;

                    const onMove = (moveEv) => {
                        const delta = ((moveEv.clientY - startY) / totalH) * 100;
                        onCurtainHeightChange?.(Math.max(15, Math.min(100, startH + delta)));
                    };
                    const onUp = () => {
                        window.removeEventListener('pointermove', onMove);
                        window.removeEventListener('pointerup', onUp);
                    };
                    window.addEventListener('pointermove', onMove);
                    window.addEventListener('pointerup', onUp);
                }}
            >
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                    <GripHorizontal className="w-4 h-4 text-indigo-400" />
                    <span>Drag handle to roll curtain up or reveal board ({Math.round(curtainHeight)}%)</span>
                </div>
                
                <div className="flex items-center gap-2" onPointerDown={(e) => e.stopPropagation()}>
                    <button
                        onClick={() => onCurtainHeightChange?.(curtainHeight > 50 ? 20 : 85)}
                        className="text-[11px] px-2.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white transition"
                    >
                        {curtainHeight > 50 ? 'Roll Up' : 'Roll Down'}
                    </button>
                    <button
                        onClick={onClose}
                        className="p-1 rounded hover:bg-white/20 text-white/80 hover:text-white"
                        title="Close Curtain"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
