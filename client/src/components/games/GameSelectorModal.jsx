'use client';

import React from 'react';
import { X } from 'lucide-react';
import { FluentToolIcon, ArgonGamesIcon } from '../geometryTools/CustomToolbarIcons';

const EDUCATIONAL_GAMES = [
    {
        id: 'sudoku',
        fluentIcon: 'fluent-color:number-symbol-square-24',
        title: 'Classroom Sudoku',
        desc: '4×4 & 9×9 logic grids with pencil notes, hints, and stamp-to-board.',
        badge: 'Logic',
        cardClass: 'bg-sky-500/10 border-sky-500/30 hover:border-sky-400/70'
    },
    {
        id: 'crossword',
        fluentIcon: 'fluent-color:sparkle-24',
        title: 'AI Crosswords',
        desc: 'Generate interactive STEM crosswords on any topic and stamp to board.',
        badge: 'AI Puzzle',
        cardClass: 'bg-violet-500/10 border-violet-500/30 hover:border-violet-400/70'
    }
];

export default function GameSelectorModal({ isOpen, onClose, onSelectGame }) {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl animate-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between mb-1.5">
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                        <ArgonGamesIcon className="w-5 h-5" />
                        <span>Educational Brain Games</span>
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition"
                        title="Close"
                        aria-label="Close Educational Games"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <p className="text-slate-400 text-xs mb-5">
                    Interactive classroom puzzles you can solve live or stamp onto your whiteboard page.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {EDUCATIONAL_GAMES.map((g) => (
                        <button
                            key={g.id}
                            type="button"
                            onClick={() => onSelectGame(g.id)}
                            className={`group relative flex flex-col items-start gap-2.5 p-4 rounded-xl border ${g.cardClass} shadow-lg transition-all duration-150 hover:scale-[1.02] active:scale-[0.98] text-left cursor-pointer`}
                        >
                            <div className="w-full flex items-center justify-between">
                                <FluentToolIcon icon={g.fluentIcon} className="w-7 h-7" />
                                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                                    {g.badge}
                                </span>
                            </div>
                            <div>
                                <div className="text-white font-semibold text-sm">{g.title}</div>
                                <div className="text-slate-400 text-xs mt-1 leading-snug">{g.desc}</div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
