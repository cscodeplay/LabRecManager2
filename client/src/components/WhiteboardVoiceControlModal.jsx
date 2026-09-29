import React from 'react';
import { Mic, MicOff, X, Volume2, Sparkles, Check, Play, HelpCircle } from 'lucide-react';

export default function WhiteboardVoiceControlModal({
    isOpen,
    onClose,
    isListening,
    onToggleListen,
    transcript,
    voiceFeedback,
    onExecuteCommand
}) {
    if (!isOpen) return null;

    const commandGroups = [
        {
            category: 'Smart Shapes',
            icon: '🔷',
            description: 'Draw geometric and smart shapes at canvas center',
            commands: [
                { phrase: 'draw circle [radius 80]', action: 'draw a circle with radius 80', desc: 'Draws a circle with optional radius in pixels (default 60)' },
                { phrase: 'draw square [size 100]', action: 'draw a square of size 100', desc: 'Draws a square with optional side length (default 100)' },
                { phrase: 'draw rectangle [200 by 120]', action: 'draw a rectangle 200 by 120', desc: 'Draws a rectangle with width and height' },
                { phrase: 'draw triangle', action: 'draw a triangle', desc: 'Draws an equilateral triangle' },
                { phrase: 'draw pentagon', action: 'draw a pentagon', desc: 'Draws a regular 5-sided pentagon' },
                { phrase: 'draw hexagon', action: 'draw a hexagon', desc: 'Draws a regular 6-sided hexagon' },
                { phrase: 'draw star', action: 'draw a star', desc: 'Draws a 5-pointed star' },
                { phrase: 'draw diamond', action: 'draw a diamond', desc: 'Draws a diamond / rhombus' },
                { phrase: 'draw line / arrow', action: 'draw an arrow', desc: 'Draws a straight line or arrow' }
            ]
        },
        {
            category: 'Text & Notes',
            icon: '✍️',
            description: 'Type formatted text directly on the board',
            commands: [
                { phrase: 'type [message]', action: 'type Antigravity Whiteboard', desc: 'Inserts typed digital text on the board' },
                { phrase: 'type [message] font size [32]', action: 'type Chapter 1 font size 32', desc: 'Types text with a specified font size' },
                { phrase: 'write [message]', action: 'write Important Note', desc: 'Alternative phrasing to type notes' }
            ]
        },
        {
            category: 'Tools & Modes',
            icon: '🛠️',
            description: 'Instantly switch active whiteboard tools',
            commands: [
                { phrase: 'pen / pencil', action: 'pen', desc: 'Switch to freehand drawing pen' },
                { phrase: 'sparkle / sparkle pen', action: 'sparkle', desc: 'Switch to glitter sparkle brush' },
                { phrase: 'highlighter', action: 'highlighter', desc: 'Switch to transparent highlighter' },
                { phrase: 'eraser', action: 'eraser', desc: 'Switch to stroke & object eraser' },
                { phrase: 'select / pointer', action: 'select', desc: 'Switch to selection tool' },
                { phrase: 'laser pointer', action: 'laser', desc: 'Switch to temporary laser pointer' }
            ]
        },
        {
            category: 'Colors & Style',
            icon: '🎨',
            description: 'Change colors and stroke width',
            commands: [
                { phrase: 'color red / blue / green / etc.', action: 'color blue', desc: 'Set drawing color (red, blue, green, yellow, purple, black, white)' },
                { phrase: 'thickness [6] / stroke width [8]', action: 'thickness 6', desc: 'Set active brush stroke thickness' }
            ]
        },
        {
            category: 'Canvas & Navigation',
            icon: '🧭',
            description: 'Control whiteboard view and multi-page documents',
            commands: [
                { phrase: 'zoom in / zoom out', action: 'zoom in', desc: 'Increase or decrease whiteboard zoom' },
                { phrase: 'reset zoom', action: 'reset zoom', desc: 'Reset zoom level back to 100%' },
                { phrase: 'new page / add page', action: 'add page', desc: 'Create a new blank whiteboard page' },
                { phrase: 'next page / previous page', action: 'next page', desc: 'Navigate between existing pages' },
                { phrase: 'undo / redo', action: 'undo', desc: 'Undo or redo canvas changes' },
                { phrase: 'clear whiteboard', action: 'clear whiteboard', desc: 'Clear active board contents' }
            ]
        }
    ];

    return (
        <div className="fixed inset-0 z-90 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
            <div
                className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col text-slate-100 overflow-hidden"
                style={{ backgroundColor: '#0f172a' }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-5 py-4 border-b border-slate-700/80 flex items-center justify-between bg-slate-900">
                    <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl flex items-center justify-center transition ${
                            isListening ? 'bg-rose-500/20 text-rose-400 ring-2 ring-rose-500/40 animate-pulse' : 'bg-indigo-500/20 text-indigo-400'
                        }`}>
                            <Mic className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="font-bold text-base text-white">Whiteboard Voice Control</h3>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                    isListening ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'bg-slate-700 text-slate-300'
                                }`}>
                                    {isListening ? 'Listening' : 'Mic Idle'}
                                </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">
                                Speak naturally to draw shapes, type text, switch tools, or navigate pages.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onToggleListen}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-sm ${
                                isListening
                                    ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse'
                                    : 'bg-primary-600 hover:bg-primary-500 text-white'
                            }`}
                        >
                            {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                            <span>{isListening ? 'Stop Listening' : 'Start Listening'}</span>
                        </button>

                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                            title="Close"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Live Speech Recognition Feedback Bar */}
                <div className="px-5 py-3 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${isListening ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
                        <div className="min-w-0">
                            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                                {isListening ? 'Heard Speech' : 'Last Recognized Command'}
                            </span>
                            <span className="text-xs font-mono text-emerald-400 truncate block">
                                {transcript || (isListening ? 'Speak a statement from below...' : 'Microphone idle. Click "Start Listening" to begin.')}
                            </span>
                        </div>
                    </div>
                    {voiceFeedback && (
                        <span className="text-xs font-medium text-amber-300 bg-amber-950/40 border border-amber-500/30 px-2 py-0.5 rounded-md shrink-0">
                            {voiceFeedback}
                        </span>
                    )}
                </div>

                {/* Statements List Body */}
                <div className="p-5 overflow-y-auto space-y-5 flex-1">
                    {commandGroups.map((group, gIdx) => (
                        <div key={gIdx} className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-3.5">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-base">{group.icon}</span>
                                <h4 className="font-semibold text-sm text-white">{group.category}</h4>
                                <span className="text-[11px] text-slate-400 ml-auto hidden sm:inline">{group.description}</span>
                            </div>

                            <div className="divide-y divide-slate-700/40 mt-2">
                                {group.commands.map((cmd, cIdx) => (
                                    <div key={cIdx} className="py-2 flex items-center justify-between gap-3 text-xs">
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <code className="px-2 py-0.5 rounded-md bg-slate-950 text-indigo-300 border border-indigo-500/30 font-mono text-[11px]">
                                                    "{cmd.phrase}"
                                                </code>
                                            </div>
                                            <p className="text-[11px] text-slate-400 mt-0.5">{cmd.desc}</p>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => onExecuteCommand && onExecuteCommand(cmd.action)}
                                            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white border border-slate-700 hover:border-indigo-500 transition shrink-0 flex items-center gap-1"
                                            title={`Simulate: "${cmd.action}"`}
                                        >
                                            <Play className="w-2.5 h-2.5" />
                                            <span>Try</span>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
                    <span className="flex items-center gap-1.5">
                        <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
                        Say <code className="text-indigo-300 font-mono">"help"</code> anytime while listening to open this guide.
                    </span>
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs transition"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}
