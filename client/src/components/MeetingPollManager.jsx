'use client';

import React from 'react';
import LiveMeetingQuiz from '@/components/LiveMeetingQuiz';

export default function MeetingPollManager({ 
    socket, 
    roomId,
    user,
    isInstructor, 
    activePoll,
    setActivePoll,
    pollResults,
    setPollResults,
    onClose
}) {
    return (
        <div className="fixed top-20 right-6 w-[420px] bg-slate-900 rounded-3xl shadow-2xl border border-slate-700/80 z-50 overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in">
            <div className="bg-slate-850 p-4 border-b border-slate-800 flex justify-between items-center">
                <h3 className="text-white font-bold text-sm flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    PhysicsWallah-Style Live Quiz
                </h3>
                {onClose && (
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition">
                        ✕
                    </button>
                )}
            </div>
            
            <div className="flex-1 overflow-y-auto flex flex-col">
                <LiveMeetingQuiz
                    socket={socket}
                    roomId={roomId}
                    user={user}
                    isHost={isInstructor}
                    activeQuiz={activePoll}
                    setActiveQuiz={setActivePoll}
                    quizResponses={pollResults || {}}
                    setQuizResponses={setPollResults}
                />
            </div>
        </div>
    );
}
