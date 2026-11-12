'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { X, Sparkles, Loader2, Lightbulb, CheckCircle2, Stamp, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import { aiAPI } from '@/lib/api';
import { FluentToolIcon } from '../geometryTools/CustomToolbarIcons';

const TOPIC_PRESETS = [
    'Physics Laws & Optics',
    'Organic Chemistry',
    'Data Structures',
    'Cell Biology',
    'Calculus & Geometry'
];

const FALLBACK_BANKS = {
    'Physics Laws & Optics': [
        { word: 'VECTOR', clue: 'Quantity with both magnitude and direction' },
        { word: 'ENERGY', clue: 'Capacity to perform mechanical work' },
        { word: 'ORBIT', clue: 'Curved path around a gravitational body' },
        { word: 'PRISM', clue: 'Transparent optical block that disperses light' },
        { word: 'FORCE', clue: 'Mass times acceleration in SI mechanics' },
        { word: 'TORQUE', clue: 'Rotational equivalent of linear force' },
        { word: 'OPTICS', clue: 'Branch of physics studying light behavior' },
        { word: 'JOULE', clue: 'SI derived unit of work and energy' }
    ],
    default: [
        { word: 'ATOM', clue: 'Smallest unit of a chemical element' },
        { word: 'MATRIX', clue: 'Rectangular array of numbers or symbols' },
        { word: 'CELL', clue: 'Basic structural unit of living organisms' },
        { word: 'GRAPH', clue: 'Visual coordinate plot relating variables' },
        { word: 'AXIS', clue: 'Reference line in a coordinate plane' },
        { word: 'SLOPE', clue: 'Rate of vertical change per horizontal step' },
        { word: 'PROTON', clue: 'Positively charged subatomic particle' },
        { word: 'ION', clue: 'Charged atom or molecule' }
    ]
};

/**
 * Deterministic crossword intersection layout builder:
 * sorts candidate words longest-first and guarantees zero invalid overlaps.
 */
function buildCrosswordLayout(rawEntries = []) {
    const clean = rawEntries
        .map(e => ({
            word: String(e?.word || '').toUpperCase().replace(/[^A-Z]/g, ''),
            clue: String(e?.clue || '').trim()
        }))
        .filter(e => e.word.length >= 3 && e.word.length <= 12 && e.clue);

    const unique = [];
    const seen = new Set();
    for (const item of clean) {
        if (!seen.has(item.word)) {
            seen.add(item.word);
            unique.push(item);
        }
    }
    unique.sort((a, b) => b.word.length - a.word.length);

    if (unique.length === 0) return null;

    const placed = []; // { word, clue, row, col, dir: 'across'|'down' }
    const cells = new Map(); // "r,c" -> char

    const key = (r, c) => `${r},${c}`;

    const canPlace = (word, r0, c0, dir) => {
        const dr = dir === 'down' ? 1 : 0;
        const dc = dir === 'across' ? 1 : 0;

        // Cell immediately before start and after end must be empty
        if (cells.has(key(r0 - dr, c0 - dc))) return false;
        if (cells.has(key(r0 + dr * word.length, c0 + dc * word.length))) return false;

        let intersections = 0;
        for (let i = 0; i < word.length; i++) {
            const r = r0 + dr * i;
            const c = c0 + dc * i;
            const existing = cells.get(key(r, c));
            if (existing) {
                if (existing !== word[i]) return false;
                intersections++;
            } else {
                // Ensure no parallel adjacent neighbor touches without crossing
                const perpR = dir === 'across' ? 1 : 0;
                const perpC = dir === 'down' ? 1 : 0;
                if (cells.has(key(r + perpR, c + perpC)) || cells.has(key(r - perpR, c - perpC))) {
                    return false;
                }
            }
        }
        return placed.length === 0 || intersections > 0;
    };

    const commit = (entry, r0, c0, dir) => {
        const dr = dir === 'down' ? 1 : 0;
        const dc = dir === 'across' ? 1 : 0;
        for (let i = 0; i < entry.word.length; i++) {
            cells.set(key(r0 + dr * i, c0 + dc * i), entry.word[i]);
        }
        placed.push({ ...entry, row: r0, col: c0, dir });
    };

    commit(unique[0], 0, 0, 'across');

    for (let idx = 1; idx < unique.length; idx++) {
        const candidate = unique[idx];
        let didPlace = false;
        for (const p of placed) {
            const tryDir = p.dir === 'across' ? 'down' : 'across';
            for (let i = 0; i < p.word.length && !didPlace; i++) {
                const pr = p.row + (p.dir === 'down' ? i : 0);
                const pc = p.col + (p.dir === 'across' ? i : 0);
                for (let j = 0; j < candidate.word.length && !didPlace; j++) {
                    if (candidate.word[j] !== p.word[i]) continue;
                    const r0 = tryDir === 'down' ? pr - j : pr;
                    const c0 = tryDir === 'across' ? pc - j : pc;
                    if (canPlace(candidate.word, r0, c0, tryDir)) {
                        commit(candidate, r0, c0, tryDir);
                        didPlace = true;
                    }
                }
            }
            if (didPlace) break;
        }
    }

    // Normalize coordinates to positive bounding box
    let minR = Infinity, maxR = -Infinity, minC = Infinity, maxC = -Infinity;
    for (const k of cells.keys()) {
        const [r, c] = k.split(',').map(Number);
        minR = Math.min(minR, r);
        maxR = Math.max(maxR, r);
        minC = Math.min(minC, c);
        maxC = Math.max(maxC, c);
    }

    const rows = maxR - minR + 1;
    const cols = maxC - minC + 1;
    const solutionGrid = Array.from({ length: rows }, () => Array(cols).fill(null));
    for (const [k, ch] of cells.entries()) {
        const [r, c] = k.split(',').map(Number);
        solutionGrid[r - minR][c - minC] = ch;
    }

    const normalizedWords = placed.map(p => ({
        ...p,
        row: p.row - minR,
        col: p.col - minC
    }));

    // Assign standard reading-order clue numbers
    const starts = new Map();
    normalizedWords
        .slice()
        .sort((a, b) => (a.row - b.row) || (a.col - b.col))
        .forEach(w => {
            const sk = `${w.row},${w.col}`;
            if (!starts.has(sk)) starts.set(sk, starts.size + 1);
        });

    const numbered = normalizedWords.map(w => ({
        ...w,
        number: starts.get(`${w.row},${w.col}`)
    }));

    return {
        rows,
        cols,
        solutionGrid,
        numberStarts: starts,
        across: numbered.filter(w => w.dir === 'across').sort((a, b) => a.number - b.number),
        down: numbered.filter(w => w.dir === 'down').sort((a, b) => a.number - b.number),
    };
}

export default function WhiteboardCrosswordGame({ onExit, onStampToBoard }) {
    const [topic, setTopic] = useState('Physics Laws & Optics');
    const [difficulty, setDifficulty] = useState('standard');
    const [isGenerating, setIsGenerating] = useState(false);
    const [puzzle, setPuzzle] = useState(null);
    const [userGrid, setUserGrid] = useState([]);
    const [activeDir, setActiveDir] = useState('across');
    const [selectedCell, setSelectedCell] = useState(null);
    const [checkedResult, setCheckedResult] = useState(null);

    const applyLayout = useCallback((entries, label) => {
        const built = buildCrosswordLayout(entries);
        if (!built) {
            toast.error('Could not arrange interlocking crossword words');
            return;
        }
        setPuzzle({ ...built, topic: label });
        setUserGrid(built.solutionGrid.map(row => row.map(cell => (cell ? '' : null))));
        setSelectedCell(null);
        setCheckedResult(null);
    }, []);

    const handleGenerate = useCallback(async (overrideTopic) => {
        const q = (overrideTopic ?? topic).trim() || 'STEM Fundamentals';
        setIsGenerating(true);
        try {
            const res = await aiAPI.cardAssist({
                type: 'whiteboard_crossword',
                prompt: q,
                context: { topic: q, difficulty, count: 10 }
            });
            const entries = res?.data?.data?.entries;
            if (Array.isArray(entries) && entries.length >= 4) {
                applyLayout(entries, res.data.data.topic || q);
                toast.success(`Generated "${q}" crossword!`, { icon: '✨' });
                return;
            }
            throw new Error('Insufficient AI crossword words');
        } catch (err) {
            const fallback = FALLBACK_BANKS[q] || FALLBACK_BANKS.default;
            applyLayout(fallback, q);
            toast('Loaded curated STEM crossword', { icon: '🧩' });
        } finally {
            setIsGenerating(false);
        }
    }, [topic, difficulty, applyLayout]);

    useEffect(() => {
        applyLayout(FALLBACK_BANKS['Physics Laws & Optics'], 'Physics Laws & Optics');
    }, [applyLayout]);

    const isSolved = useMemo(() => {
        if (!puzzle) return false;
        for (let r = 0; r < puzzle.rows; r++) {
            for (let c = 0; c < puzzle.cols; c++) {
                const sol = puzzle.solutionGrid[r][c];
                if (sol && (userGrid[r]?.[c] || '') !== sol) return false;
            }
        }
        return true;
    }, [puzzle, userGrid]);

    useEffect(() => {
        if (!puzzle) return;
        const onKeyDown = (e) => {
            if (document.activeElement?.tagName === 'INPUT') return;
            if (!selectedCell) return;
            const { r, c } = selectedCell;

            if (/^[a-zA-Z]$/.test(e.key)) {
                e.preventDefault();
                const ch = e.key.toUpperCase();
                setUserGrid(prev => {
                    const next = prev.map(row => [...row]);
                    next[r][c] = ch;
                    return next;
                });
                setCheckedResult(null);
                const dr = activeDir === 'down' ? 1 : 0;
                const dc = activeDir === 'across' ? 1 : 0;
                const nr = r + dr;
                const nc = c + dc;
                if (puzzle.solutionGrid[nr]?.[nc]) {
                    setSelectedCell({ r: nr, c: nc });
                }
            } else if (e.key === 'Backspace') {
                e.preventDefault();
                setUserGrid(prev => {
                    const next = prev.map(row => [...row]);
                    if (next[r][c]) {
                        next[r][c] = '';
                    } else {
                        const dr = activeDir === 'down' ? 1 : 0;
                        const dc = activeDir === 'across' ? 1 : 0;
                        const pr = r - dr;
                        const pc = c - dc;
                        if (puzzle.solutionGrid[pr]?.[pc]) {
                            next[pr][pc] = '';
                            setSelectedCell({ r: pr, c: pc });
                        }
                    }
                    return next;
                });
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [puzzle, selectedCell, activeDir]);

    const handleRevealCell = () => {
        if (!puzzle) return;
        let target = selectedCell;
        if (!target || !puzzle.solutionGrid[target.r]?.[target.c]) {
            outer: for (let r = 0; r < puzzle.rows; r++) {
                for (let c = 0; c < puzzle.cols; c++) {
                    if (puzzle.solutionGrid[r][c] && userGrid[r]?.[c] !== puzzle.solutionGrid[r][c]) {
                        target = { r, c };
                        break outer;
                    }
                }
            }
        }
        if (!target) return;
        setUserGrid(prev => {
            const next = prev.map(row => [...row]);
            next[target.r][target.c] = puzzle.solutionGrid[target.r][target.c];
            return next;
        });
    };

    const handleCheckGrid = () => {
        if (!puzzle) return;
        let wrong = 0;
        let filled = 0;
        let total = 0;
        for (let r = 0; r < puzzle.rows; r++) {
            for (let c = 0; c < puzzle.cols; c++) {
                const sol = puzzle.solutionGrid[r][c];
                if (!sol) continue;
                total++;
                const val = userGrid[r]?.[c] || '';
                if (val) {
                    filled++;
                    if (val !== sol) wrong++;
                }
            }
        }
        setCheckedResult({ wrong, filled, total });
        if (wrong === 0 && filled === total) {
            toast.success('Crossword solved 100%!', { icon: '🎉' });
        } else if (wrong === 0) {
            toast.success(`${filled}/${total} letters right so far!`, { icon: '✨' });
        } else {
            toast.error(`${wrong} letter(s) need correction`);
        }
    };

    return (
        <div className="fixed inset-0 z-[9995] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 select-none">
            <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90dvh] overflow-hidden flex flex-col text-slate-100 animate-in zoom-in-95 duration-150">
                {/* Header */}
                <div className="px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 bg-slate-900">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center">
                            <FluentToolIcon icon="fluent-color:sparkle-24" className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-white leading-tight">AI Crossword Studio</h2>
                            <p className="text-[11px] text-slate-400">Generate interlocking classroom crosswords on any topic</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                        {onStampToBoard && puzzle && (
                            <button
                                type="button"
                                onClick={() => onStampToBoard({
                                    type: 'crossword',
                                    title: `Crossword: ${puzzle.topic}`,
                                    puzzle
                                })}
                                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow transition"
                            >
                                <Stamp className="w-3.5 h-3.5" />
                                <span>Stamp to Board</span>
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={onExit}
                            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
                            title="Close Crossword"
                            aria-label="Close Crossword"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Generator Bar */}
                <div className="px-4 py-2.5 border-b border-slate-800 bg-slate-950/60 flex flex-col gap-2">
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            handleGenerate();
                        }}
                        className="flex flex-wrap items-center gap-2"
                    >
                        <input
                            type="text"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder="Enter subject or topic (e.g. Thermodynamics, DBMS, Trigonometry)..."
                            className="flex-1 min-w-[200px] bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                        />
                        <select
                            value={difficulty}
                            onChange={(e) => setDifficulty(e.target.value)}
                            className="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                        >
                            <option value="easy">Easy</option>
                            <option value="standard">Standard</option>
                        </select>
                        <button
                            type="submit"
                            disabled={isGenerating}
                            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-60 text-white text-xs font-bold flex items-center gap-1.5 shadow transition"
                        >
                            {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                            <span>{isGenerating ? 'Generating...' : 'AI Generate'}</span>
                        </button>
                    </form>
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 custom-scrollbar">
                        {TOPIC_PRESETS.map(p => (
                            <button
                                key={p}
                                type="button"
                                onClick={() => { setTopic(p); handleGenerate(p); }}
                                className="px-2.5 py-1 rounded-full bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 text-[11px] text-slate-300 hover:text-white whitespace-nowrap transition"
                            >
                                {p}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main Grid + Clues */}
                {puzzle && (
                    <div className="flex-1 min-h-0 overflow-y-auto p-4 grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-5 items-start">
                        {/* Grid */}
                        <div className="flex flex-col items-center gap-3 mx-auto">
                            <div
                                className="grid gap-0.5 bg-slate-950 p-2 rounded-xl border border-slate-700/80 shadow-inner"
                                style={{
                                    gridTemplateColumns: `repeat(${puzzle.cols}, minmax(0, 1fr))`
                                }}
                            >
                                {puzzle.solutionGrid.map((row, r) =>
                                    row.map((solChar, c) => {
                                        if (!solChar) {
                                            return <div key={`${r}-${c}`} className="w-7 h-7 sm:w-8 sm:h-8 rounded-md bg-slate-950" />;
                                        }
                                        const num = puzzle.numberStarts.get(`${r},${c}`);
                                        const val = userGrid[r]?.[c] || '';
                                        const isSel = selectedCell?.r === r && selectedCell?.c === c;
                                        const isWrong = checkedResult && val && val !== solChar;

                                        return (
                                            <button
                                                key={`${r}-${c}`}
                                                type="button"
                                                onClick={() => {
                                                    if (isSel) setActiveDir(d => (d === 'across' ? 'down' : 'across'));
                                                    setSelectedCell({ r, c });
                                                }}
                                                className={`relative w-7 h-7 sm:w-8 sm:h-8 rounded-md border flex items-center justify-center font-mono font-bold text-sm transition ${
                                                    isSel
                                                        ? 'bg-indigo-600/40 border-indigo-400 ring-1 ring-indigo-400 text-white'
                                                        : isWrong
                                                        ? 'bg-rose-950/60 border-rose-500 text-rose-300'
                                                        : 'bg-slate-800 border-slate-600 text-white hover:border-slate-400'
                                                }`}
                                            >
                                                {num && (
                                                    <span className="absolute top-0.5 left-1 text-[8px] font-sans font-bold text-slate-400 leading-none">
                                                        {num}
                                                    </span>
                                                )}
                                                {val}
                                            </button>
                                        );
                                    })
                                )}
                            </div>

                            {/* Grid Toolbar */}
                            <div className="flex items-center gap-2 text-xs">
                                <button
                                    type="button"
                                    onClick={() => setActiveDir(d => (d === 'across' ? 'down' : 'across'))}
                                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 font-semibold hover:bg-slate-700 transition"
                                >
                                    Dir: {activeDir === 'across' ? 'Across →' : 'Down ↓'}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleRevealCell}
                                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-amber-300 font-semibold hover:bg-slate-700 flex items-center gap-1 transition"
                                >
                                    <Lightbulb className="w-3.5 h-3.5" />
                                    <span>Hint</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={handleCheckGrid}
                                    className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1 transition"
                                >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Check</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setUserGrid(puzzle.solutionGrid.map(r => r.map(c => (c ? '' : null))));
                                        setCheckedResult(null);
                                    }}
                                    className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition"
                                    title="Clear Grid"
                                >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>

                        {/* Across & Down Clues */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 space-y-2">
                                <div className="font-bold text-indigo-300 uppercase tracking-wider border-b border-slate-800 pb-1">
                                    Across ({puzzle.across.length})
                                </div>
                                <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                                    {puzzle.across.map(w => (
                                        <button
                                            key={`a-${w.number}`}
                                            type="button"
                                            onClick={() => {
                                                setActiveDir('across');
                                                setSelectedCell({ r: w.row, c: w.col });
                                            }}
                                            className="w-full text-left p-1.5 rounded-lg hover:bg-slate-800/80 transition flex gap-2"
                                        >
                                            <span className="font-mono font-bold text-indigo-400 shrink-0">{w.number}.</span>
                                            <span className="text-slate-200 leading-snug">{w.clue} <span className="text-slate-500">({w.word.length})</span></span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 space-y-2">
                                <div className="font-bold text-violet-300 uppercase tracking-wider border-b border-slate-800 pb-1">
                                    Down ({puzzle.down.length})
                                </div>
                                <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                                    {puzzle.down.map(w => (
                                        <button
                                            key={`d-${w.number}`}
                                            type="button"
                                            onClick={() => {
                                                setActiveDir('down');
                                                setSelectedCell({ r: w.row, c: w.col });
                                            }}
                                            className="w-full text-left p-1.5 rounded-lg hover:bg-slate-800/80 transition flex gap-2"
                                        >
                                            <span className="font-mono font-bold text-violet-400 shrink-0">{w.number}.</span>
                                            <span className="text-slate-200 leading-snug">{w.clue} <span className="text-slate-500">({w.word.length})</span></span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {isSolved && (
                    <div className="px-4 py-2 bg-emerald-600/20 border-t border-emerald-500/40 text-emerald-300 text-xs font-semibold text-center">
                        🎉 Crossword complete! You can stamp it onto the board or generate a new topic above.
                    </div>
                )}
            </div>
        </div>
    );
}
