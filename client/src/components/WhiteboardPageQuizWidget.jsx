'use client';

import React, { useState } from 'react';
import { 
    HelpCircle, Play, BarChart3, Share2, Trash2, Clock, 
    CheckCircle2, Sparkles, QrCode, Copy, Check, ExternalLink, Move
} from 'lucide-react';
import toast from 'react-hot-toast';
import QRCode from 'qrcode';

export default function WhiteboardPageQuizWidget({
    quiz,
    pageIndex,
    isInstructor,
    onTakeQuiz,
    onViewResults,
    onDetach,
    onPositionChange
}) {
    const [showShareModal, setShowShareModal] = useState(false);
    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const [copied, setCopied] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    const joinUrl = typeof window !== 'undefined' 
        ? `${window.location.origin}/quiz/join/${quiz.code || quiz.id}`
        : `/quiz/join/${quiz.code || quiz.id}`;

    const handleOpenShare = async (e) => {
        e.stopPropagation();
        try {
            const dataUrl = await QRCode.toDataURL(joinUrl, { width: 240, margin: 2 });
            setQrCodeUrl(dataUrl);
            setShowShareModal(true);
        } catch (err) {
            console.error('Failed to generate QR code', err);
            setShowShareModal(true);
        }
    };

    const handleCopyLink = (e) => {
        e.stopPropagation();
        if (typeof navigator !== 'undefined') {
            navigator.clipboard.writeText(joinUrl);
            setCopied(true);
            toast.success('Join link copied to clipboard!');
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleMouseDown = (e) => {
        if (e.target.closest('button') || e.target.closest('input')) return;
        setIsDragging(true);
        setDragOffset({
            x: e.clientX - (quiz.x || 40),
            y: e.clientY - (quiz.y || 40)
        });
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        const newX = Math.max(10, e.clientX - dragOffset.x);
        const newY = Math.max(10, e.clientY - dragOffset.y);
        if (onPositionChange) {
            onPositionChange(quiz.id || quiz.code, newX, newY);
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const difficultyColors = {
        easy: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        medium: 'bg-blue-100 text-blue-800 border-blue-300',
        hard: 'bg-purple-100 text-purple-800 border-purple-300',
        mixed: 'bg-amber-100 text-amber-800 border-amber-300'
    };

    return (
        <div
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            style={{
                left: `${quiz.x || 40}px`,
                top: `${quiz.y || 40}px`,
                position: 'absolute',
                zIndex: 45
            }}
            className="w-84 max-w-[340px] bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border-2 border-indigo-200/80 p-4 select-none transition-shadow hover:shadow-2xl cursor-default group"
        >
            {/* Header Banner */}
            <div className="flex items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md flex-shrink-0">
                        <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                        <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                                Attached Quiz
                            </span>
                            <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${difficultyColors[quiz.difficulty?.toLowerCase()] || difficultyColors.medium}`}>
                                {quiz.difficulty || 'Medium'}
                            </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 truncate" title={quiz.title}>
                            {quiz.title || 'Interactive Quiz'}
                        </h4>
                    </div>
                </div>

                {/* Move Grip & Detach */}
                <div className="flex items-center gap-1">
                    <span className="p-1 text-slate-400 cursor-grab active:cursor-grabbing hover:text-slate-600" title="Drag to reposition">
                        <Move className="w-4 h-4" />
                    </span>
                    {isInstructor && onDetach && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onDetach(quiz.id || quiz.code, pageIndex);
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Detach from this page"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Quick Stats */}
            <div className="flex items-center gap-3 text-xs text-slate-600 bg-slate-50 rounded-xl p-2 mb-3 border border-slate-100">
                <span className="flex items-center gap-1 font-medium">
                    <HelpCircle className="w-3.5 h-3.5 text-indigo-500" />
                    {quiz.totalQuestions || (quiz.questions ? quiz.questions.length : 5)} Questions
                </span>
                <span className="w-1 h-1 bg-slate-300 rounded-full" />
                <span className="flex items-center gap-1 font-medium">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    {quiz.timeLimitMinutes || 10} Mins
                </span>
                <span className="w-1 h-1 bg-slate-300 rounded-full" />
                <span className="font-mono font-bold text-slate-700 bg-white px-1.5 py-0.5 rounded border border-slate-200 text-[11px]">
                    {quiz.code || 'CODE'}
                </span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        if (onTakeQuiz) onTakeQuiz(quiz);
                    }}
                    className="flex-1 py-2 px-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition flex items-center justify-center gap-1.5"
                >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Launch Quiz
                </button>

                {isInstructor && onViewResults && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onViewResults(quiz);
                        }}
                        className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
                        title="View Live Results & Leaderboard"
                    >
                        <BarChart3 className="w-4 h-4" />
                    </button>
                )}

                <button
                    onClick={handleOpenShare}
                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
                    title="Share Link & QR Code"
                >
                    <Share2 className="w-4 h-4" />
                </button>
            </div>

            {/* Share & QR Code Modal */}
            {showShareModal && (
                <div 
                    className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 cursor-default"
                    onClick={(e) => {
                        e.stopPropagation();
                        setShowShareModal(false);
                    }}
                >
                    <div 
                        className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 text-center animate-in fade-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                            <QrCode className="w-6 h-6" />
                        </div>
                        <h3 className="font-bold text-slate-900 text-base mb-1">
                            {quiz.title}
                        </h3>
                        <p className="text-xs text-slate-500 mb-4">
                            Scan with a phone camera or open the link on another device to join.
                        </p>

                        {qrCodeUrl && (
                            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 inline-block mb-4 shadow-inner">
                                <img src={qrCodeUrl} alt="Quiz QR Code" className="w-48 h-48 mx-auto rounded-lg" />
                            </div>
                        )}

                        <div className="mb-4">
                            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                Join Code
                            </div>
                            <div className="text-2xl font-mono font-extrabold tracking-widest text-indigo-600 bg-indigo-50 py-1.5 px-4 rounded-xl border border-indigo-200 inline-block">
                                {quiz.code || 'CODE'}
                            </div>
                        </div>

                        <div className="flex items-center gap-2 mb-4 bg-slate-100 p-2 rounded-xl text-xs font-mono text-slate-700 truncate border border-slate-200">
                            <span className="truncate flex-1 text-left px-1">{joinUrl}</span>
                            <button
                                onClick={handleCopyLink}
                                className="p-1.5 bg-white hover:bg-slate-50 text-slate-800 rounded-lg shadow-sm border border-slate-200 transition flex items-center gap-1 flex-shrink-0"
                            >
                                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                {copied ? 'Copied' : 'Copy'}
                            </button>
                        </div>

                        <button
                            onClick={() => setShowShareModal(false)}
                            className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition"
                        >
                            Done
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
