'use client';

import React from 'react';
import { X, Crosshair, Apple } from 'lucide-react';

const GAMES = [
  {
    id: 'shooter',
    icon: '🔫',
    iconFallback: Crosshair,
    title: 'Shooter',
    desc: 'Shoot enemies, destroy obstacles, reach the goal!',
    color: 'from-red-500/20 to-orange-500/20',
    border: 'border-red-500/30 hover:border-red-400/60',
    glow: 'hover:shadow-red-500/20',
  },
  {
    id: 'snake',
    icon: '🐍',
    iconFallback: Apple,
    title: 'Snake',
    desc: 'Collect fruit, avoid obstacles and your tail!',
    color: 'from-green-500/20 to-emerald-500/20',
    border: 'border-green-500/30 hover:border-green-400/60',
    glow: 'hover:shadow-green-500/20',
  },
];

export default function GameSelectorModal({ isOpen, onClose, onSelectGame }) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-6 sm:p-8 max-w-md w-full mx-4 shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="text-2xl">🎮</span>
            Whiteboard Games
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-slate-400 text-sm mb-6">
          Canvas shapes become game obstacles! Draw walls, barriers & targets, then play.
        </p>

        {/* Game Cards */}
        <div className="grid grid-cols-2 gap-4">
          {GAMES.map((g) => (
            <button
              key={g.id}
              onClick={() => onSelectGame(g.id)}
              className={`group relative flex flex-col items-center gap-3 p-5 rounded-xl border bg-gradient-to-br ${g.color} ${g.border} ${g.glow} shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.03] active:scale-[0.98] cursor-pointer`}
            >
              <span className="text-4xl" role="img" aria-label={g.title}>
                {g.icon}
              </span>
              <div className="text-center">
                <div className="text-white font-semibold text-base">{g.title}</div>
                <div className="text-slate-400 text-xs mt-1 leading-tight">{g.desc}</div>
              </div>
              {/* Play badge */}
              <span className="absolute top-2 right-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 group-hover:text-white/60 transition">
                Play ▶
              </span>
            </button>
          ))}
        </div>

        {/* Tip */}
        <div className="mt-5 bg-slate-800/60 rounded-lg px-4 py-2.5 border border-slate-700/50">
          <p className="text-xs text-slate-400 leading-relaxed">
            <span className="text-amber-400 font-medium">💡 Tip:</span>{' '}
            Draw shapes on the whiteboard first — they become walls and obstacles in the game!
            Dark-filled shapes are indestructible walls. Empty canvas? Random obstacles are generated.
          </p>
        </div>
      </div>
    </div>
  );
}
