'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    Layers,
    X,
    RotateCw,
    ChevronLeft,
    ChevronRight,
    Plus,
    Trash2,
    Edit3,
    Check,
    Volume2,
    Sparkles,
    Download,
    Upload,
    BookOpen,
    Brain,
    Flame,
    Share2,
    RefreshCw,
    Sun,
    Moon
} from 'lucide-react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import toast from 'react-hot-toast';

// Built-in Rich STEM Study Decks (Anki / Quizlet inspired)
const DEFAULT_STEM_DECKS = [
    {
        id: 'calculus_derivatives',
        title: 'Calculus & Derivatives',
        subject: 'Mathematics',
        color: '#6366f1',
        cards: [
            {
                id: 'calc_1',
                question: 'What is the derivative of $\\sin(x)$?',
                answer: '$\\frac{d}{dx}[\\sin(x)] = \\cos(x)$',
                hint: 'Trigonometric rate of change at the origin is 1.',
                rating: 0
            },
            {
                id: 'calc_2',
                question: 'State the Quotient Rule for differentiation:',
                answer: '$\\left(\\frac{u}{v}\\right)\' = \\frac{u\'v - uv\'}{v^2}$',
                hint: 'Low d-high minus high d-low over the square of what is below.',
                rating: 0
            },
            {
                id: 'calc_3',
                question: 'State the Integration by Parts formula:',
                answer: '$\\int u \\, dv = uv - \\int v \\, du$',
                hint: 'Derived directly from the product rule of differentiation.',
                rating: 0
            },
            {
                id: 'calc_4',
                question: 'What is the derivative of $e^{kx}$?',
                answer: '$\\frac{d}{dx}[e^{kx}] = k e^{kx}$',
                hint: 'Exponential function is proportional to its own rate of change.',
                rating: 0
            },
            {
                id: 'calc_5',
                question: 'State the Fundamental Theorem of Calculus (Part 1):',
                answer: '$\\frac{d}{dx}\\left[\\int_a^x f(t)\\,dt\\right] = f(x)$',
                hint: 'Differentiation and integration are inverse operations.',
                rating: 0
            }
        ]
    },
    {
        id: 'physics_laws',
        title: 'Physics Laws & Constants',
        subject: 'Physics',
        color: '#06b6d4',
        cards: [
            {
                id: 'phys_1',
                question: 'State Newton\'s Second Law in momentum form:',
                answer: '$\\vec{F}_{\\text{net}} = \\frac{d\\vec{p}}{dt} = m\\vec{a}$',
                hint: 'Net force equals rate of change of linear momentum.',
                rating: 0
            },
            {
                id: 'phys_2',
                question: 'State Einstein\'s Mass-Energy Equivalence:',
                answer: '$E = m c^2$',
                hint: 'c = speed of light $\\approx 3 \\times 10^8\\text{ m/s}$.',
                rating: 0
            },
            {
                id: 'phys_3',
                question: 'State the Planck-Einstein Relation for photon energy:',
                answer: '$E = h \\nu = \\frac{h c}{\\lambda}$',
                hint: 'h = Planck constant $\\approx 6.626 \\times 10^{-34}\\text{ J}\\cdot\\text{s}$.',
                rating: 0
            },
            {
                id: 'phys_4',
                question: 'State Maxwell\'s Gauss\'s Law for Electricity:',
                answer: '$\\nabla \\cdot \\vec{E} = \\frac{\\rho}{\\varepsilon_0}$',
                hint: 'Electric flux through any closed surface is proportional to enclosed charge.',
                rating: 0
            },
            {
                id: 'phys_5',
                question: 'State the Heisenberg Uncertainty Principle:',
                answer: '$\\Delta x \\,\\Delta p \\ge \\frac{\\hbar}{2}$',
                hint: 'Position and momentum cannot both be precisely known simultaneously.',
                rating: 0
            }
        ]
    },
    {
        id: 'geometry_trig',
        title: 'Geometry & Trigonometric Identities',
        subject: 'Geometry',
        color: '#10b981',
        cards: [
            {
                id: 'geom_1',
                question: 'State Euler\'s Identity:',
                answer: '$e^{i \\pi} + 1 = 0$',
                hint: 'Connects five fundamental mathematical constants: e, i, pi, 1, and 0.',
                rating: 0
            },
            {
                id: 'geom_2',
                question: 'State the Pythagorean Theorem & Trigonometric Identity:',
                answer: '$\\sin^2(\\theta) + \\cos^2(\\theta) = 1$',
                hint: 'Unit circle definition of points $(x, y) = (\\cos\\theta, \\sin\\theta)$.',
                rating: 0
            },
            {
                id: 'geom_3',
                question: 'State the Law of Cosines for any triangle:',
                answer: '$c^2 = a^2 + b^2 - 2ab\\cos(C)$',
                hint: 'Generalization of Pythagorean theorem for non-right triangles.',
                rating: 0
            },
            {
                id: 'geom_4',
                question: 'State Heron\'s Formula for triangle area:',
                answer: '$A = \\sqrt{s(s-a)(s-b)(s-c)}, \\quad s = \\frac{a+b+c}{2}$',
                hint: 's is the semi-perimeter of the triangle.',
                rating: 0
            },
            {
                id: 'geom_5',
                question: 'State the Double-Angle formula for $\\sin(2\\theta)$:',
                answer: '$\\sin(2\\theta) = 2\\sin(\\theta)\\cos(\\theta)$',
                hint: 'Derived from $\\sin(A + B)$ when $A = B = \\theta$.',
                rating: 0
            }
        ]
    },
    {
        id: 'chemistry_thermo',
        title: 'Chemistry & Thermodynamics',
        subject: 'Chemistry',
        color: '#f59e0b',
        cards: [
            {
                id: 'chem_1',
                question: 'State the Ideal Gas Law equation of state:',
                answer: '$P V = n R T$',
                hint: 'Relates pressure, volume, moles, and absolute temperature.',
                rating: 0
            },
            {
                id: 'chem_2',
                question: 'State the Gibbs Free Energy equation:',
                answer: '$\\Delta G = \\Delta H - T \\Delta S$',
                hint: '$\\Delta G < 0$ indicates a thermodynamically spontaneous process.',
                rating: 0
            },
            {
                id: 'chem_3',
                question: 'State the Arrhenius Equation for reaction rate constant:',
                answer: '$k = A e^{-\\frac{E_a}{R T}}$',
                hint: 'Exponential dependence on activation energy and temperature.',
                rating: 0
            },
            {
                id: 'chem_4',
                question: 'State the Nernst Equation for electrochemical cell potential:',
                answer: '$E = E^\\circ - \\frac{R T}{n F} \\ln(Q)$',
                hint: 'Calculates non-standard reduction potential from reaction quotient Q.',
                rating: 0
            }
        ]
    }
];

export default function WhiteboardFlashcards({
    isOpen = true,
    onClose,
    onStampToBoard, // ({ title, question, answer, latex })
    boardEquations = [], // Equations extracted from canvas
    initialPosition = { x: 180, y: 100 }
}) {
    // Decks state
    const [decks, setDecks] = useState(DEFAULT_STEM_DECKS);
    const [activeDeckId, setActiveDeckId] = useState('calculus_derivatives');
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [showHint, setShowHint] = useState(false);
    const [isCreatingCard, setIsCreatingCard] = useState(false);
    const [newCard, setNewCard] = useState({ question: '', answer: '', hint: '' });

    // Draggable position
    const [pos, setPos] = useState(initialPosition);
    const [isDarkMode, setIsDarkMode] = useState(false); // Default to Light Mode
    const isDraggingRef = useRef(false);
    const dragStartRef = useRef({ x: 0, y: 0, startPosX: 0, startPosY: 0 });

    const activeDeck = decks.find(d => d.id === activeDeckId) || decks[0];
    const currentCard = activeDeck?.cards[currentCardIndex] || null;

    // Flip card toggle
    const handleFlip = () => {
        setIsFlipped(prev => !prev);
    };

    // Keyboard navigation (Space: flip, 1-4: rate, Arrows: navigate)
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            if (e.code === 'Space') {
                e.preventDefault();
                handleFlip();
            } else if (e.code === 'ArrowRight') {
                e.preventDefault();
                handleNextCard();
            } else if (e.code === 'ArrowLeft') {
                e.preventDefault();
                handlePrevCard();
            } else if (['Digit1', 'Digit2', 'Digit3', 'Digit4'].includes(e.code)) {
                e.preventDefault();
                const score = parseInt(e.code.replace('Digit', ''), 10);
                handleRateCard(score);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, activeDeck, currentCardIndex, isFlipped]);

    const handleNextCard = () => {
        if (!activeDeck) return;
        setIsFlipped(false);
        setShowHint(false);
        setCurrentCardIndex(prev => (prev + 1) % activeDeck.cards.length);
    };

    const handlePrevCard = () => {
        if (!activeDeck) return;
        setIsFlipped(false);
        setShowHint(false);
        setCurrentCardIndex(prev => (prev - 1 + activeDeck.cards.length) % activeDeck.cards.length);
    };

    // Spaced repetition rating: 1 (Again), 2 (Hard), 3 (Good), 4 (Easy)
    const handleRateCard = (rating) => {
        if (!currentCard) return;
        setDecks(prevDecks =>
            prevDecks.map(deck => {
                if (deck.id !== activeDeck.id) return deck;
                return {
                    ...deck,
                    cards: deck.cards.map(c => (c.id === currentCard.id ? { ...c, rating } : c))
                };
            })
        );

        const labels = { 1: 'Review Again', 2: 'Hard', 3: 'Good', 4: 'Mastered' };
        toast.success(`Rated: ${labels[rating]}`, { icon: rating === 4 ? '🌟' : '⏱️' });

        // Advance to next card smoothly
        setTimeout(() => {
            handleNextCard();
        }, 220);
    };

    // Safe KaTeX rendering for formulas in text
    const renderContentWithKatex = (text) => {
        if (!text) return '';
        // Replace $...$ or $$...$$ with KaTeX HTML
        return text.replace(/\$\$([\s\S]*?)\$\$|\$([^\$]+)\$/g, (match, displayMath, inlineMath) => {
            const math = displayMath || inlineMath;
            try {
                return katex.renderToString(math, {
                    displayMode: !!displayMath,
                    throwOnError: false
                });
            } catch {
                return math;
            }
        });
    };

    // Text to Speech
    const handleSpeak = (text) => {
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
            toast.error('Speech synthesis not supported');
            return;
        }
        window.speechSynthesis.cancel();
        // Strip LaTeX dollar signs for natural speech
        const plain = text.replace(/\$+/g, '').replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1 over $2');
        const utterance = new SpeechSynthesisUtterance(plain);
        utterance.rate = 0.95;
        window.speechSynthesis.speak(utterance);
    };

    // Stamp active card onto whiteboard canvas
    const handleStampCardToWhiteboard = () => {
        if (!onStampToBoard || !currentCard) return;
        onStampToBoard({
            title: activeDeck.title,
            question: currentCard.question,
            answer: currentCard.answer,
            hint: currentCard.hint || '',
            subject: activeDeck.subject
        });
        toast.success('Stamped flashcard onto whiteboard!', { icon: '🃏' });
    };

    // Auto-generate deck from whiteboard notes/equations
    const handleGenerateDeckFromBoard = () => {
        if (!boardEquations || boardEquations.length === 0) {
            toast('No equations found on active page to generate flashcards from.', { icon: 'ℹ️' });
            return;
        }

        const generatedCards = boardEquations.slice(0, 10).map((eq, idx) => ({
            id: `gen_${Date.now()}_${idx}`,
            question: `Explain or evaluate equation: $${eq.latex || eq.text || 'x'}$`,
            answer: `Evaluated formula: $${eq.latex || eq.text || 'x'}$`,
            hint: 'From Whiteboard Canvas page note.',
            rating: 0
        }));

        const newDeck = {
            id: `board_deck_${Date.now()}`,
            title: 'Whiteboard Generated Deck',
            subject: 'Board Notes',
            color: '#a855f7',
            cards: generatedCards
        };

        setDecks(prev => [newDeck, ...prev]);
        setActiveDeckId(newDeck.id);
        setCurrentCardIndex(0);
        setIsFlipped(false);
        toast.success(`Generated study deck with ${generatedCards.length} cards from board!`, { icon: '✨' });
    };

    // Header drag handler
    const handleHeaderPointerDown = (e) => {
        if (e.target.closest('button') || e.target.closest('select')) return;
        e.preventDefault();
        isDraggingRef.current = true;
        dragStartRef.current = {
            x: e.clientX,
            y: e.clientY,
            startPosX: pos.x,
            startPosY: pos.y
        };

        const onPointerMove = (moveEvt) => {
            if (!isDraggingRef.current) return;
            const dx = moveEvt.clientX - dragStartRef.current.x;
            const dy = moveEvt.clientY - dragStartRef.current.y;
            setPos({
                x: Math.max(10, Math.min(window.innerWidth - 440, dragStartRef.current.startPosX + dx)),
                y: Math.max(10, Math.min(window.innerHeight - 100, dragStartRef.current.startPosY + dy))
            });
        };

        const onPointerUp = () => {
            isDraggingRef.current = false;
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
        };

        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
    };

    if (!isOpen) return null;

    // Theme classes based on isDarkMode (Default: Light Mode)
    const theme = {
        container: isDarkMode
            ? 'bg-slate-900/95 text-slate-100 border-slate-700/80 shadow-[0_25px_60px_rgba(0,0,0,0.6)]'
            : 'bg-white/95 text-slate-800 border-slate-200/90 shadow-[0_20px_50px_rgba(15,23,42,0.18)]',
        header: isDarkMode
            ? 'bg-slate-800/80 border-slate-700/80 text-white'
            : 'bg-slate-100/90 border-slate-200 text-slate-800',
        headerSubtitle: isDarkMode ? 'text-slate-400' : 'text-slate-500',
        deckBar: isDarkMode
            ? 'bg-slate-950/60 border-slate-800 text-slate-300'
            : 'bg-slate-50 border-slate-200 text-slate-700',
        select: isDarkMode
            ? 'bg-slate-800 text-slate-200 border-slate-700 focus:border-indigo-500'
            : 'bg-white text-slate-800 border-slate-300 focus:border-indigo-600 shadow-xs',
        progressBarBg: isDarkMode ? 'bg-slate-800' : 'bg-slate-200',
        cardFront: isDarkMode
            ? 'bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700/80 text-slate-100'
            : 'bg-white border-slate-200 text-slate-900 shadow-md',
        cardBack: isDarkMode
            ? 'bg-gradient-to-br from-indigo-950/70 via-slate-900 to-slate-900 border-indigo-500/50 text-cyan-200'
            : 'bg-gradient-to-br from-indigo-50/80 via-white to-slate-50 border-indigo-200 text-indigo-950 shadow-md',
        questionText: isDarkMode ? 'text-slate-100' : 'text-slate-900',
        answerText: isDarkMode ? 'text-cyan-200' : 'text-indigo-900',
        navBtn: isDarkMode
            ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-xs',
        divider: isDarkMode ? 'border-slate-800' : 'border-slate-200',
        rateAgain: isDarkMode
            ? 'bg-rose-950/60 hover:bg-rose-900 border-rose-800/60 text-rose-300'
            : 'bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-800 shadow-xs',
        rateHard: isDarkMode
            ? 'bg-amber-950/60 hover:bg-amber-900 border-amber-800/60 text-amber-300'
            : 'bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-800 shadow-xs',
        rateGood: isDarkMode
            ? 'bg-sky-950/60 hover:bg-sky-900 border-sky-800/60 text-sky-300'
            : 'bg-sky-50 hover:bg-sky-100 border-sky-200 text-sky-800 shadow-xs',
        rateEasy: isDarkMode
            ? 'bg-emerald-950/60 hover:bg-emerald-900 border-emerald-800/60 text-emerald-300'
            : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-800 shadow-xs',
    };

    return (
        <div
            style={{
                position: 'fixed',
                left: `${pos.x}px`,
                top: `${pos.y}px`,
                zIndex: 90
            }}
            className={`w-[440px] select-none rounded-3xl backdrop-blur-2xl border flex flex-col overflow-hidden font-sans animate-in fade-in zoom-in-95 duration-150 ${theme.container}`}
        >
            {/* Header with Drag Handle */}
            <div
                onPointerDown={handleHeaderPointerDown}
                className={`px-4 py-3 border-b flex items-center justify-between cursor-move ${theme.header}`}
            >
                <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shadow-xs">
                        <Layers className="w-4 h-4" />
                    </div>
                    <div>
                        <div className="text-xs font-bold tracking-wide flex items-center gap-1.5">
                            <span>STEM Flashcards</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-500/20 text-indigo-400 font-mono font-semibold">
                                Anki/Quizlet
                            </span>
                        </div>
                        <div className={`text-[10px] ${theme.headerSubtitle}`}>
                            Spaced Repetition & KaTeX Math
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    {/* Dark/Light Mode Toggle */}
                    <button
                        type="button"
                        onClick={() => setIsDarkMode(d => !d)}
                        className={`p-1.5 rounded-lg transition ${
                            isDarkMode ? 'text-amber-300 hover:bg-slate-700/60' : 'text-slate-600 hover:bg-slate-200'
                        }`}
                        title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                    >
                        {isDarkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                    </button>

                    {/* Auto-generate from board */}
                    <button
                        type="button"
                        onClick={handleGenerateDeckFromBoard}
                        className={`p-1.5 rounded-lg transition ${
                            isDarkMode ? 'text-slate-400 hover:text-amber-300 hover:bg-slate-700/60' : 'text-slate-500 hover:text-amber-600 hover:bg-slate-200'
                        }`}
                        title="Generate deck from whiteboard equations"
                    >
                        <Sparkles className="w-3.5 h-3.5" />
                    </button>

                    {/* Stamp to board */}
                    <button
                        type="button"
                        onClick={handleStampCardToWhiteboard}
                        className={`p-1.5 rounded-lg transition ${
                            isDarkMode ? 'text-slate-400 hover:text-cyan-300 hover:bg-slate-700/60' : 'text-slate-500 hover:text-cyan-600 hover:bg-slate-200'
                        }`}
                        title="Stamp current flashcard onto whiteboard"
                    >
                        <Share2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Close */}
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition"
                        title="Close Flashcards"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* Deck Selector & Progress Bar */}
            <div className={`px-4 py-2 border-b flex items-center justify-between gap-2 ${theme.deckBar}`}>
                <select
                    value={activeDeckId}
                    onChange={(e) => {
                        setActiveDeckId(e.target.value);
                        setCurrentCardIndex(0);
                        setIsFlipped(false);
                    }}
                    className={`text-xs font-semibold rounded-lg px-2.5 py-1 outline-none border cursor-pointer ${theme.select}`}
                >
                    {decks.map(deck => (
                        <option key={deck.id} value={deck.id}>
                            {deck.title} ({deck.cards.length} cards)
                        </option>
                    ))}
                </select>

                <div className="text-[11px] font-mono font-semibold opacity-75">
                    {currentCardIndex + 1} / {activeDeck?.cards.length || 0}
                </div>
            </div>

            {/* Progress Bar Indicator */}
            {activeDeck && (
                <div className={`w-full h-1 ${theme.progressBarBg}`}>
                    <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-300"
                        style={{
                            width: `${((currentCardIndex + 1) / activeDeck.cards.length) * 100}%`
                        }}
                    />
                </div>
            )}

            {/* 3D Flashcard Stage */}
            <div className="p-4 flex flex-col items-center">
                <div
                    onClick={handleFlip}
                    style={{ perspective: '1200px' }}
                    className="w-full h-[230px] cursor-pointer group"
                >
                    <div
                        style={{
                            transformStyle: 'preserve-3d',
                            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                            transition: 'transform 0.45s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                        className="relative w-full h-full rounded-2xl shadow-xl select-none"
                    >
                        {/* FRONT FACE (Question) */}
                        <div
                            style={{
                                backfaceVisibility: 'hidden',
                                WebkitBackfaceVisibility: 'hidden'
                            }}
                            className={`absolute inset-0 p-5 rounded-2xl border flex flex-col justify-between ${theme.cardFront}`}
                        >
                            <div className="flex items-center justify-between text-[11px] opacity-80">
                                <span className="uppercase tracking-wider font-bold text-indigo-500">
                                    Question
                                </span>
                                <div className="flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleSpeak(currentCard?.question || '');
                                        }}
                                        className={`p-1 rounded transition ${isDarkMode ? 'hover:bg-slate-700 text-slate-400 hover:text-white' : 'hover:bg-slate-200 text-slate-600'}`}
                                        title="Read aloud"
                                    >
                                        <Volume2 className="w-3.5 h-3.5" />
                                    </button>
                                    <span className="text-[10px] opacity-60 italic">
                                        Click / Space to flip
                                    </span>
                                </div>
                            </div>

                            <div
                                className={`my-auto text-center text-sm md:text-base font-medium leading-relaxed overflow-y-auto max-h-[130px] custom-scrollbar px-2 ${theme.questionText}`}
                                dangerouslySetInnerHTML={{
                                    __html: renderContentWithKatex(currentCard?.question || '')
                                }}
                            />

                            {/* Optional Hint */}
                            {currentCard?.hint && (
                                <div className={`text-[11px] pt-1 border-t flex items-center justify-between ${theme.divider}`}>
                                    {showHint ? (
                                        <span className="text-amber-500 italic font-medium">💡 {currentCard.hint}</span>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setShowHint(true);
                                            }}
                                            className="text-indigo-500 hover:underline flex items-center gap-1 text-[10px] font-semibold"
                                        >
                                            <span>💡 Show Hint</span>
                                        </button>
                                    )}
                                    <span className="text-[10px] opacity-50">Front</span>
                                </div>
                            )}
                        </div>

                        {/* BACK FACE (Answer) */}
                        <div
                            style={{
                                backfaceVisibility: 'hidden',
                                WebkitBackfaceVisibility: 'hidden',
                                transform: 'rotateY(180deg)'
                            }}
                            className={`absolute inset-0 p-5 rounded-2xl border flex flex-col justify-between ${theme.cardBack}`}
                        >
                            <div className="flex items-center justify-between text-[11px] text-indigo-500 font-bold">
                                <span className="uppercase tracking-wider">
                                    Answer & Explanation
                                </span>
                                <div className="flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleSpeak(currentCard?.answer || '');
                                        }}
                                        className={`p-1 rounded transition ${isDarkMode ? 'hover:bg-slate-700 text-slate-400 hover:text-white' : 'hover:bg-slate-200 text-slate-600'}`}
                                        title="Read aloud"
                                    >
                                        <Volume2 className="w-3.5 h-3.5" />
                                    </button>
                                    <span className="text-[10px] opacity-60 italic font-normal">
                                        Click to flip back
                                    </span>
                                </div>
                            </div>

                            <div
                                className={`my-auto text-center text-sm md:text-base font-semibold leading-relaxed overflow-y-auto max-h-[130px] custom-scrollbar px-2 ${theme.answerText}`}
                                dangerouslySetInnerHTML={{
                                    __html: renderContentWithKatex(currentCard?.answer || '')
                                }}
                            />

                            <div className={`text-[10px] opacity-50 text-right pt-1 border-t ${theme.divider}`}>
                                Back
                            </div>
                        </div>
                    </div>
                </div>

                {/* Navigation & Spaced Repetition Rating Buttons */}
                <div className="w-full mt-3 flex flex-col gap-2">
                    {/* Navigation Bar */}
                    <div className="flex items-center justify-between">
                        <button
                            type="button"
                            onClick={handlePrevCard}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold transition ${theme.navBtn}`}
                            title="Previous card (Left Arrow)"
                        >
                            <ChevronLeft className="w-3.5 h-3.5" />
                            <span>Prev</span>
                        </button>

                        <button
                            type="button"
                            onClick={handleFlip}
                            className="flex items-center gap-1 px-3 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition active:scale-95"
                            title="Flip Card (Space)"
                        >
                            <RotateCw className="w-3 h-3" />
                            <span>{isFlipped ? 'Show Front' : 'Show Answer'}</span>
                        </button>

                        <button
                            type="button"
                            onClick={handleNextCard}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold transition ${theme.navBtn}`}
                            title="Next card (Right Arrow)"
                        >
                            <span>Next</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    {/* Spaced Repetition Mastery Rating (Anki: 1 Again, 2 Hard, 3 Good, 4 Easy) */}
                    <div className={`pt-2 border-t ${theme.divider}`}>
                        <div className="text-[10px] opacity-75 font-semibold mb-1 text-center">
                            Rate your recall (Keys: 1, 2, 3, 4):
                        </div>
                        <div className="grid grid-cols-4 gap-1.5 text-xs font-bold">
                            <button
                                type="button"
                                onClick={() => handleRateCard(1)}
                                className={`py-1.5 rounded-xl border transition flex flex-col items-center ${theme.rateAgain}`}
                                title="Review Again (Key 1)"
                            >
                                <span className="text-[11px]">Again</span>
                                <span className="text-[9px] opacity-80 font-mono">&lt; 1m</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => handleRateCard(2)}
                                className={`py-1.5 rounded-xl border transition flex flex-col items-center ${theme.rateHard}`}
                                title="Hard (Key 2)"
                            >
                                <span className="text-[11px]">Hard</span>
                                <span className="text-[9px] opacity-80 font-mono">1d</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => handleRateCard(3)}
                                className={`py-1.5 rounded-xl border transition flex flex-col items-center ${theme.rateGood}`}
                                title="Good (Key 3)"
                            >
                                <span className="text-[11px]">Good</span>
                                <span className="text-[9px] opacity-80 font-mono">3d</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => handleRateCard(4)}
                                className={`py-1.5 rounded-xl border transition flex flex-col items-center ${theme.rateEasy}`}
                                title="Easy / Mastered (Key 4)"
                            >
                                <span className="text-[11px]">Easy</span>
                                <span className="text-[9px] opacity-80 font-mono">7d</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
