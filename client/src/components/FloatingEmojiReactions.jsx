'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Smile, Sparkles, X } from 'lucide-react';

const REACTION_EMOJIS = [
    { emoji: '👏', label: 'Clap' },
    { emoji: '❤️', label: 'Heart' },
    { emoji: '👍', label: 'Thumbs Up' },
    { emoji: '🎉', label: 'Party' },
    { emoji: '🔥', label: 'Fire' },
    { emoji: '😂', label: 'Laugh' },
    { emoji: '💡', label: 'Idea' },
    { emoji: '🚀', label: 'Rocket' },
    { emoji: '✋', label: 'Raise Hand' }
];

export default function FloatingEmojiReactions({
    socket,
    roomId,
    user,
    floatingReactions,
    setFloatingReactions,
    showPicker,
    setShowPicker
}) {
    // Send reaction to room
    const handleSendReaction = useCallback((emojiItem) => {
        const userName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Participant';
        const reactionData = {
            id: `rx-${Date.now()}-${Math.random()}`,
            emoji: emojiItem.emoji,
            label: emojiItem.label,
            userName,
            userId: user?.id,
            timestamp: Date.now()
        };

        if (socket) {
            socket.emit('meeting:reaction', {
                roomId,
                reaction: reactionData
            });
        }

        // Spawn locally immediately
        spawnFloatingParticles(reactionData);
    }, [socket, roomId, user]);

    // Spawn 5-8 burst particles for every reaction
    const spawnFloatingParticles = useCallback((rxData) => {
        const count = 6;
        const newParticles = [];
        const baseLeft = Math.floor(Math.random() * 60) + 20; // 20% to 80% horizontal start

        for (let i = 0; i < count; i++) {
            newParticles.push({
                id: `${rxData.id}-p-${i}-${Math.random()}`,
                emoji: rxData.emoji,
                userName: i === 0 ? rxData.userName : null, // only attach name tag to main particle
                left: baseLeft + (Math.random() * 14 - 7),
                driftX: (Math.random() * 80 - 40),
                scale: 0.9 + Math.random() * 0.8,
                duration: 2.0 + Math.random() * 0.8,
                delay: i * 0.08
            });
        }

        setFloatingReactions(prev => [...prev.slice(-30), ...newParticles]);
    }, [setFloatingReactions]);

    // Auto cleanup floating particles after animation completes
    useEffect(() => {
        if (floatingReactions.length === 0) return;
        const timer = setTimeout(() => {
            setFloatingReactions(prev => prev.filter(p => Date.now() - (p.createdAt || Date.now()) < 3000));
        }, 2800);
        return () => clearTimeout(timer);
    }, [floatingReactions, setFloatingReactions]);

    return (
        <>
            {/* ========================================================================= */}
            {/* FLOATING ANIMATED PARTICLES LAYER                                         */}
            {/* ========================================================================= */}
            <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden select-none">
                {floatingReactions.map((p) => (
                    <div
                        key={p.id}
                        style={{
                            position: 'absolute',
                            bottom: '80px',
                            left: `${p.left}%`,
                            transform: `scale(${p.scale})`,
                            animation: `floatUp ${p.duration}s cubic-bezier(0.25, 1, 0.5, 1) ${p.delay}s forwards`
                        }}
                        className="flex flex-col items-center will-change-transform"
                    >
                        <span className="text-3xl filter drop-shadow-lg select-none">
                            {p.emoji}
                        </span>
                        {p.userName && (
                            <span className="text-[10px] font-bold bg-slate-900/80 text-white px-2 py-0.5 rounded-full border border-slate-700/60 mt-1 shadow-md whitespace-nowrap">
                                {p.userName}
                            </span>
                        )}
                    </div>
                ))}
            </div>

            {/* ========================================================================= */}
            {/* EMOJI REACTION TOOLBAR POPUP                                              */}
            {/* ========================================================================= */}
            {showPicker && (
                <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200 pointer-events-auto">
                    <div className="bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl p-2 shadow-2xl flex items-center gap-1">
                        {REACTION_EMOJIS.map((item) => (
                            <button
                                key={item.emoji}
                                onClick={() => handleSendReaction(item)}
                                className="w-9 h-9 rounded-xl hover:bg-slate-800 flex items-center justify-center text-xl hover:scale-125 active:scale-95 transition-all"
                                title={item.label}
                            >
                                {item.emoji}
                            </button>
                        ))}
                        <div className="w-[1px] h-6 bg-slate-800 mx-1" />
                        <button
                            onClick={() => setShowPicker(false)}
                            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                            title="Close reactions"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            )}

            {/* Custom CSS Animation for Floating Emojis */}
            <style jsx global>{`
                @keyframes floatUp {
                    0% {
                        opacity: 0;
                        transform: translateY(20px) scale(0.6);
                    }
                    15% {
                        opacity: 1;
                        transform: translateY(-20px) scale(1.1);
                    }
                    70% {
                        opacity: 0.9;
                        transform: translateY(-220px) scale(1);
                    }
                    100% {
                        opacity: 0;
                        transform: translateY(-380px) scale(0.8);
                    }
                }
            `}</style>
        </>
    );
}
