'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { X, RotateCcw, Lightbulb, Pencil, CheckCircle2, Clock, Stamp, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { FluentToolIcon } from '../geometryTools/CustomToolbarIcons';

function shuffleArray(arr) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

function isValidPlacement(board, row, col, num, size, boxR, boxC) {
    for (let i = 0; i < size; i++) {
        if (board[row][i] === num || board[i][col] === num) return false;
    }
    const startR = Math.floor(row / boxR) * boxR;
    const startC = Math.floor(col / boxC) * boxC;
    for (let r = 0; r < boxR; r++) {
        for (let c = 0; c < boxC; c++) {
            if (board[startR + r][startC + c] === num) return false;
        }
    }
    return true;
}

function generateSolvedBoard(size) {
    const boxR = size === 4 ? 2 : 3;
    const boxC = size === 4 ? 2 : 3;
    const board = Array.from({ length: size }, () => Array(size).fill(0));
    const digits = Array.from({ length: size }, (_, i) => i + 1);

    function solve(idx = 0) {
        if (idx === size * size) return true;
        const r = Math.floor(idx / size);
        const c = idx % size;
        for (const num of shuffleArray(digits)) {
            if (isValidPlacement(board, r, c, num, size, boxR, boxC)) {
                board[r][c] = num;
                if (solve(idx + 1)) return true;
                board[r][c] = 0;
            }
        }
        return false;
    }

    solve();
    return board;
}

function createSudokuPuzzle(size = 9, difficulty = 'easy') {
    const solution = generateSolvedBoard(size);
    const puzzle = solution.map(row => [...row]);
    const total = size * size;
    const removeRatio =
        size === 4
            ? (difficulty === 'easy' ? 0.42 : difficulty === 'medium' ? 0.52 : 0.62)
            : (difficulty === 'easy' ? 0.48 : difficulty === 'medium' ? 0.58 : 0.67);
    const toRemove = Math.floor(total * removeRatio);
    const indices = shuffleArray(Array.from({ length: total }, (_, i) => i)).slice(0, toRemove);
    for (const idx of indices) {
        puzzle[Math.floor(idx / size)][idx % size] = 0;
    }
    return { puzzle, solution };
}

export default function WhiteboardSudokuGame({ onExit, onStampToBoard }) {
    const [gridSize, setGridSize] = useState(9); // 4 or 9
    const [difficulty, setDifficulty] = useState('easy');
    const [solution, setSolution] = useState([]);
    const [initialGrid, setInitialGrid] = useState([]);
    const [board, setBoard] = useState([]);
    const [notes, setNotes] = useState({}); // "r-c" -> Set<number>
    const [selectedCell, setSelectedCell] = useState(null);
    const [notesMode, setNotesMode] = useState(false);
    const [seconds, setSeconds] = useState(0);
    const [isSolved, setIsSolved] = useState(false);
    const [hintsUsed, setHintsUsed] = useState(0);

    const startNewGame = useCallback((nextSize = gridSize, nextDiff = difficulty) => {
        const { puzzle, solution: sol } = createSudokuPuzzle(nextSize, nextDiff);
        setSolution(sol);
        setInitialGrid(puzzle.map(r => [...r]));
        setBoard(puzzle.map(r => [...r]));
        setNotes({});
        setSelectedCell(null);
        setSeconds(0);
        setIsSolved(false);
        setHintsUsed(0);
    }, [gridSize, difficulty]);

    useEffect(() => {
        startNewGame(gridSize, difficulty);
    }, [gridSize, difficulty, startNewGame]);

    useEffect(() => {
        if (isSolved) return;
        const timer = setInterval(() => setSeconds(s => s + 1), 1000);
        return () => clearInterval(timer);
    }, [isSolved]);

    const boxSize = gridSize === 4 ? 2 : 3;

    const conflicts = useMemo(() => {
        const set = new Set();
        for (let r = 0; r < gridSize; r++) {
            for (let c = 0; c < gridSize; c++) {
                const val = board[r]?.[c] || 0;
                if (!val) continue;
                for (let k = 0; k < gridSize; k++) {
                    if (k !== c && board[r][k] === val) set.add(`${r}-${c}`);
                    if (k !== r && board[k][c] === val) set.add(`${r}-${c}`);
                }
                const br = Math.floor(r / boxSize) * boxSize;
                const bc = Math.floor(c / boxSize) * boxSize;
                for (let dr = 0; dr < boxSize; dr++) {
                    for (let dc = 0; dc < boxSize; dc++) {
                        const rr = br + dr;
                        const cc = bc + dc;
                        if ((rr !== r || cc !== c) && board[rr]?.[cc] === val) {
                            set.add(`${r}-${c}`);
                        }
                    }
                }
            }
        }
        return set;
    }, [board, gridSize, boxSize]);

    const applyDigit = useCallback((digit) => {
        if (!selectedCell || isSolved) return;
        const { r, c } = selectedCell;
        if (initialGrid[r]?.[c] !== 0) return;

        if (notesMode && digit !== 0) {
            const key = `${r}-${c}`;
            setNotes(prev => {
                const next = { ...prev };
                const current = new Set(next[key] || []);
                if (current.has(digit)) current.delete(digit);
                else current.add(digit);
                next[key] = current;
                return next;
            });
            return;
        }

        setBoard(prev => {
            const next = prev.map(row => [...row]);
            next[r][c] = digit;
            // Check completion
            let complete = true;
            for (let rr = 0; rr < gridSize; rr++) {
                for (let cc = 0; cc < gridSize; cc++) {
                    if (next[rr][cc] !== solution[rr]?.[cc]) {
                        complete = false;
                        break;
                    }
                }
                if (!complete) break;
            }
            if (complete) {
                setIsSolved(true);
                toast.success('Sudoku solved cleanly!', { icon: '🎉' });
            }
            return next;
        });
        if (digit !== 0) {
            setNotes(prev => {
                const next = { ...prev };
                delete next[`${r}-${c}`];
                return next;
            });
        }
    }, [selectedCell, isSolved, initialGrid, notesMode, gridSize, solution]);

    useEffect(() => {
        const handleKey = (e) => {
            if (e.key >= '1' && e.key <= String(gridSize)) {
                e.preventDefault();
                applyDigit(parseInt(e.key, 10));
            } else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
                e.preventDefault();
                applyDigit(0);
            } else if (selectedCell) {
                if (e.key === 'ArrowUp') setSelectedCell(s => ({ r: Math.max(0, s.r - 1), c: s.c }));
                if (e.key === 'ArrowDown') setSelectedCell(s => ({ r: Math.min(gridSize - 1, s.r + 1), c: s.c }));
                if (e.key === 'ArrowLeft') setSelectedCell(s => ({ r: s.r, c: Math.max(0, s.c - 1) }));
                if (e.key === 'ArrowRight') setSelectedCell(s => ({ r: s.r, c: Math.min(gridSize - 1, s.c + 1) }));
            }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [applyDigit, gridSize, selectedCell]);

    const handleHint = () => {
        if (isSolved) return;
        let target = selectedCell;
        if (!target || initialGrid[target.r]?.[target.c] !== 0 || board[target.r]?.[target.c] === solution[target.r]?.[target.c]) {
            const candidates = [];
            for (let r = 0; r < gridSize; r++) {
                for (let c = 0; c < gridSize; c++) {
                    if (board[r]?.[c] !== solution[r]?.[c]) candidates.push({ r, c });
                }
            }
            if (candidates.length === 0) return;
            target = candidates[Math.floor(Math.random() * candidates.length)];
        }
        setSelectedCell(target);
        setBoard(prev => {
            const next = prev.map(row => [...row]);
            next[target.r][target.c] = solution[target.r][target.c];
            return next;
        });
        setHintsUsed(h => h + 1);
    };

    const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

    return (
        <div className="fixed inset-0 z-[9995] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 select-none">
            <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col text-slate-100 animate-in zoom-in-95 duration-150">
                {/* Header */}
                <div className="px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 bg-slate-900/95">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center">
                            <FluentToolIcon icon="fluent-color:number-symbol-square-24" className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-white leading-tight">Classroom Sudoku</h2>
                            <p className="text-[11px] text-slate-400">Logical deduction &amp; pattern training</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                        <div className="flex bg-slate-800 rounded-lg p-0.5 border border-slate-700 text-xs">
                            {[4, 9].map(sz => (
                                <button
                                    key={sz}
                                    type="button"
                                    onClick={() => setGridSize(sz)}
                                    className={`px-2 py-1 rounded-md font-semibold transition ${gridSize === sz ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                                >
                                    {sz}×{sz}
                                </button>
                            ))}
                        </div>
                        <select
                            value={difficulty}
                            onChange={(e) => setDifficulty(e.target.value)}
                            className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                        >
                            <option value="easy">Easy</option>
                            <option value="medium">Medium</option>
                            <option value="hard">Hard</option>
                        </select>
                        <span className="px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs font-mono text-slate-300 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-sky-400" />
                            {formatTime(seconds)}
                        </span>
                        <button
                            type="button"
                            onClick={onExit}
                            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
                            title="Close Sudoku"
                            aria-label="Close Sudoku"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="p-4 flex flex-col sm:flex-row items-center justify-center gap-5">
                    {/* Grid */}
                    <div
                        className="grid bg-slate-800 border-2 border-slate-500 rounded-xl overflow-hidden shadow-inner"
                        style={{
                            gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
                            width: gridSize === 4 ? '240px' : 'min(342px, 84vw)',
                            height: gridSize === 4 ? '240px' : 'min(342px, 84vw)',
                        }}
                    >
                        {board.map((row, r) =>
                            row.map((val, c) => {
                                const isInitial = initialGrid[r]?.[c] !== 0;
                                const isSel = selectedCell?.r === r && selectedCell?.c === c;
                                const isSameLine = selectedCell && (selectedCell.r === r || selectedCell.c === c);
                                const isConflict = conflicts.has(`${r}-${c}`);
                                const cellNotes = notes[`${r}-${c}`];
                                const borderRight = (c + 1) % boxSize === 0 && c < gridSize - 1 ? 'border-r-2 border-r-slate-500' : 'border-r border-r-slate-700/70';
                                const borderBottom = (r + 1) % boxSize === 0 && r < gridSize - 1 ? 'border-b-2 border-b-slate-500' : 'border-b border-b-slate-700/70';

                                return (
                                    <button
                                        key={`${r}-${c}`}
                                        type="button"
                                        onClick={() => setSelectedCell({ r, c })}
                                        className={`relative flex items-center justify-center transition ${borderRight} ${borderBottom} ${
                                            isSel
                                                ? 'bg-indigo-600/45 ring-2 ring-inset ring-indigo-400'
                                                : isConflict
                                                ? 'bg-rose-950/60 text-rose-300'
                                                : isSameLine
                                                ? 'bg-slate-800/90'
                                                : 'bg-slate-900/90 hover:bg-slate-800/70'
                                        }`}
                                    >
                                        {val !== 0 ? (
                                            <span className={`${gridSize === 4 ? 'text-xl' : 'text-base sm:text-lg'} font-mono font-bold ${
                                                isConflict
                                                    ? 'text-rose-400'
                                                    : isInitial
                                                    ? 'text-slate-100'
                                                    : 'text-sky-300'
                                            }`}>
                                                {val}
                                            </span>
                                        ) : cellNotes && cellNotes.size > 0 ? (
                                            <div className="grid grid-cols-3 gap-0 w-full h-full p-0.5 text-[8px] text-slate-400 font-mono leading-none items-center justify-items-center">
                                                {Array.from(cellNotes).sort((a, b) => a - b).map(n => (
                                                    <span key={n}>{n}</span>
                                                ))}
                                            </div>
                                        ) : null}
                                    </button>
                                );
                            })
                        )}
                    </div>

                    {/* Side Controls & Keypad */}
                    <div className="w-full sm:w-52 flex flex-col gap-3">
                        <div className="grid grid-cols-3 gap-1.5">
                            {Array.from({ length: gridSize }, (_, i) => i + 1).map(d => (
                                <button
                                    key={d}
                                    type="button"
                                    onClick={() => applyDigit(d)}
                                    className="py-2 rounded-xl bg-slate-800 hover:bg-indigo-600 text-white font-mono font-bold text-sm border border-slate-700 transition active:scale-95"
                                >
                                    {d}
                                </button>
                            ))}
                            <button
                                type="button"
                                onClick={() => applyDigit(0)}
                                className="col-span-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition"
                            >
                                Clear Cell
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-1.5 text-xs">
                            <button
                                type="button"
                                onClick={() => setNotesMode(n => !n)}
                                className={`py-2 px-2 rounded-xl border font-semibold flex items-center justify-center gap-1.5 transition ${
                                    notesMode ? 'bg-amber-500/20 border-amber-400 text-amber-300' : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                                }`}
                            >
                                <Pencil className="w-3.5 h-3.5" />
                                <span>Notes</span>
                            </button>
                            <button
                                type="button"
                                onClick={handleHint}
                                className="py-2 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold flex items-center justify-center gap-1.5 transition"
                                title={`Hints used: ${hintsUsed}`}
                            >
                                <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                                <span>Hint</span>
                            </button>
                        </div>

                        <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-800">
                            {onStampToBoard && (
                                <button
                                    type="button"
                                    onClick={() => onStampToBoard({
                                        type: 'sudoku',
                                        title: `Sudoku (${gridSize}×${gridSize} • ${difficulty})`,
                                        size: gridSize,
                                        grid: board
                                    })}
                                    className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow transition"
                                >
                                    <Stamp className="w-3.5 h-3.5" />
                                    <span>Stamp Grid to Board</span>
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => startNewGame(gridSize, difficulty)}
                                className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>New Puzzle</span>
                            </button>
                        </div>

                        {isSolved && (
                            <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 shrink-0" />
                                <span>Completed in {formatTime(seconds)}!</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
