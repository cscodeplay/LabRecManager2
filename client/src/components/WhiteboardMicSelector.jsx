'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Mic,
    Volume2,
    VolumeX,
    Check,
    Settings,
    RefreshCw,
    X,
    Subtitles,
    Bot,
    Sparkles,
    Sliders
} from 'lucide-react';

export default function WhiteboardMicSelector({
    isOpen,
    onClose,
    selectedDeviceId,
    onSelectDevice,
    showClosedCaptions,
    onToggleClosedCaptions,
    aiSpeechEnabled,
    onToggleAiSpeech,
    audioLevel = 0,
    isListening = false,
    voices = [],
    selectedVoice = null,
    onSelectVoice = () => {},
    speechRate = 1.0,
    onChangeSpeechRate = () => {},
    onOpenAiAssistantModal = () => {}
}) {
    const [devices, setDevices] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasPermission, setHasPermission] = useState(false);
    const [activeTab, setActiveTab] = useState('mic'); // 'mic' | 'ai_voice'
    const popoverRef = useRef(null);

    // Refresh devices list
    const refreshDevices = useCallback(async () => {
        if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
            return;
        }

        setIsLoading(true);
        try {
            const allDevices = await navigator.mediaDevices.enumerateDevices();
            const audioInputs = allDevices.filter(d => d.kind === 'audioinput');

            // Check if device labels are populated (indicates permission is granted)
            const hasLabels = audioInputs.some(d => Boolean(d.label));
            setHasPermission(hasLabels);

            setDevices(audioInputs);
        } catch (err) {
            console.warn('[WhiteboardMicSelector] Failed to enumerate audio devices:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Request temporary microphone stream to unlock device labels if needed
    const requestMicPermission = async () => {
        if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return;
        setIsLoading(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            setHasPermission(true);
            // Immediately stop tracks after getting permission
            stream.getTracks().forEach(t => t.stop());
            await refreshDevices();
        } catch (err) {
            console.error('[WhiteboardMicSelector] Permission request failed:', err);
        } finally {
            setIsLoading(false);
        }
    };

    // Load devices on open and listen to device changes
    useEffect(() => {
        if (isOpen) {
            refreshDevices();

            if (navigator.mediaDevices?.addEventListener) {
                navigator.mediaDevices.addEventListener('devicechange', refreshDevices);
                return () => {
                    navigator.mediaDevices.removeEventListener('devicechange', refreshDevices);
                };
            }
        }
    }, [isOpen, refreshDevices]);

    // Handle clicks outside to close popover
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (popoverRef.current && !popoverRef.current.contains(e.target)) {
                // If the target is not a child of the trigger button
                if (!e.target.closest('[data-mic-selector-trigger="true"]')) {
                    onClose?.();
                }
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
            };
        }
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div
            ref={popoverRef}
            className="absolute bottom-16 right-0 sm:right-auto sm:left-1/2 sm:-translate-x-1/2 z-50 w-84 bg-slate-900/98 backdrop-blur-xl border border-slate-700/80 shadow-2xl rounded-2xl text-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-150"
            style={{ width: '340px' }}
            onClick={(e) => e.stopPropagation()}
        >
            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
                        <Settings className="w-4 h-4" />
                    </div>
                    <div>
                        <h4 className="text-xs font-bold text-white tracking-wide">Audio & Voice Settings</h4>
                        <p className="text-[10px] text-slate-400">Microphone & Speech AI Synthesizer</p>
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={refreshDevices}
                        disabled={isLoading}
                        className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition disabled:opacity-50"
                        title="Refresh devices"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition"
                        title="Close"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="grid grid-cols-2 p-1.5 bg-slate-950/40 border-b border-slate-800 text-xs font-semibold">
                <button
                    type="button"
                    onClick={() => setActiveTab('mic')}
                    className={`py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition ${
                        activeTab === 'mic'
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`}
                >
                    <Mic className="w-3.5 h-3.5" />
                    <span>Microphone</span>
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('ai_voice')}
                    className={`py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition ${
                        activeTab === 'ai_voice'
                            ? 'bg-purple-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`}
                >
                    <Bot className="w-3.5 h-3.5" />
                    <span>AI Speech TTS</span>
                </button>
            </div>

            {/* AI Bot Co-Pilot & Whiteboard Tutor Hub Launcher Card */}
            <div className="p-2 bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-purple-950/40 border-b border-purple-500/20">
                <button
                    type="button"
                    onClick={() => {
                        onClose?.();
                        onOpenAiAssistantModal?.();
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs flex items-center justify-between shadow-md shadow-purple-500/20 transition group"
                >
                    <div className="flex items-center gap-2">
                        <Bot className="w-4 h-4 text-purple-200 group-hover:rotate-12 transition-transform" />
                        <span>AI Bot Co-Pilot & Tutor</span>
                    </div>
                    <span className="text-[10px] font-mono opacity-80 bg-black/30 px-1.5 py-0.5 rounded border border-white/20">Ctrl+Shift+A</span>
                </button>
            </div>

            {/* Tab 1: Microphone Devices & Live Meter */}
            {activeTab === 'mic' && (
                <div className="p-4 space-y-3.5">
                    {/* Live Audio Level Meter */}
                    <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
                        <div className="flex items-center justify-between text-[11px] font-medium mb-1.5">
                            <span className="text-slate-400 flex items-center gap-1.5">
                                <span className={`w-2 h-2 rounded-full ${isListening ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                                Input Volume Level
                            </span>
                            <span className="font-mono text-emerald-400">{audioLevel}%</span>
                        </div>

                        {/* Visual LED Level Bar */}
                        <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden p-0.5 flex items-center">
                            <div
                                className="h-full rounded-full transition-all duration-75"
                                style={{
                                    width: `${Math.min(100, Math.max(audioLevel, isListening ? 4 : 0))}%`,
                                    background: audioLevel > 75
                                        ? 'linear-gradient(90deg, #10b981, #f59e0b, #ef4444)'
                                        : audioLevel > 35
                                            ? 'linear-gradient(90deg, #10b981, #f59e0b)'
                                            : '#10b981'
                                }}
                            />
                        </div>
                    </div>

                    {/* Microphone Device Selection */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                                Select Input Device
                            </label>
                            {!hasPermission && (
                                <button
                                    type="button"
                                    onClick={requestMicPermission}
                                    className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold underline"
                                >
                                    Enable Device Names
                                </button>
                            )}
                        </div>

                        <div className="max-h-44 overflow-y-auto space-y-1.5 pr-0.5 custom-scrollbar">
                            {devices.length === 0 ? (
                                <div className="text-center py-4 text-xs text-slate-500">
                                    No audio inputs detected.
                                </div>
                            ) : (
                                devices.map((device, index) => {
                                    const isSelected = selectedDeviceId
                                        ? device.deviceId === selectedDeviceId
                                        : index === 0;

                                    const label = device.label || `Microphone ${index + 1} (${device.deviceId.slice(0, 5)}...)`;

                                    return (
                                        <button
                                            key={device.deviceId || index}
                                            type="button"
                                            onClick={() => onSelectDevice?.(device.deviceId)}
                                            className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition border ${
                                                isSelected
                                                    ? 'bg-indigo-600/20 border-indigo-500/50 text-white font-medium shadow-sm'
                                                    : 'bg-slate-800/40 border-transparent text-slate-300 hover:bg-slate-800 hover:text-white'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2 truncate pr-2">
                                                <Mic className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-indigo-400' : 'text-slate-400'}`} />
                                                <span className="truncate" title={label}>{label}</span>
                                            </div>
                                            {isSelected && (
                                                <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                            )}
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Quick Toggle: Live Closed Captions (CC) */}
                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Subtitles className="w-4 h-4 text-amber-400" />
                            <div>
                                <span className="text-xs font-semibold text-white block">Closed Captions (CC)</span>
                                <span className="text-[10px] text-slate-400 block">Live speech overlay on canvas</span>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onToggleClosedCaptions}
                            className={`w-9 h-5 rounded-full transition-colors relative p-0.5 flex items-center ${
                                showClosedCaptions ? 'bg-indigo-600' : 'bg-slate-700'
                            }`}
                        >
                            <span
                                className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform ${
                                    showClosedCaptions ? 'translate-x-4' : 'translate-x-0'
                                }`}
                            />
                        </button>
                    </div>
                </div>
            )}

            {/* Tab 2: Speech AI Synthesizer (TTS) & Responses */}
            {activeTab === 'ai_voice' && (
                <div className="p-4 space-y-3.5">
                    {/* Master AI Speech Toggle */}
                    <div className="bg-purple-950/30 border border-purple-800/40 rounded-xl p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400">
                                <Sparkles className="w-4 h-4" />
                            </div>
                            <div>
                                <span className="text-xs font-bold text-white block">Spoken AI Responses</span>
                                <span className="text-[10px] text-purple-300/80 block">AI answers verbally with voice synthesis</span>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onToggleAiSpeech}
                            className={`w-9 h-5 rounded-full transition-colors relative p-0.5 flex items-center ${
                                aiSpeechEnabled ? 'bg-purple-600' : 'bg-slate-700'
                            }`}
                        >
                            <span
                                className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform ${
                                    aiSpeechEnabled ? 'translate-x-4' : 'translate-x-0'
                                }`}
                            />
                        </button>
                    </div>

                    {/* Voice Selection */}
                    <div>
                        <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
                            AI Voice Actor
                        </label>
                        <select
                            value={selectedVoice?.name || ''}
                            onChange={(e) => {
                                const found = voices.find(v => v.name === e.target.value);
                                if (found) onSelectVoice?.(found);
                            }}
                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500 truncate"
                        >
                            {voices.length === 0 ? (
                                <option value="">Default System Voice</option>
                            ) : (
                                voices
                                    .filter(v => v.lang.startsWith('en'))
                                    .concat(voices.filter(v => !v.lang.startsWith('en')))
                                    .map(v => (
                                        <option key={v.name} value={v.name}>
                                            {v.name} ({v.lang})
                                        </option>
                                    ))
                            )}
                        </select>
                    </div>

                    {/* Speech Speed Slider */}
                    <div>
                        <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                            <span className="flex items-center gap-1 font-semibold">
                                <Sliders className="w-3 h-3 text-purple-400" />
                                Speech Rate
                            </span>
                            <span className="font-mono text-purple-300 font-bold">{speechRate}x</span>
                        </div>
                        <input
                            type="range"
                            min="0.7"
                            max="1.4"
                            step="0.1"
                            value={speechRate}
                            onChange={(e) => onChangeSpeechRate?.(parseFloat(e.target.value))}
                            className="w-full accent-purple-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                        />
                        <div className="flex justify-between text-[9px] text-slate-500 mt-1">
                            <span>Slower (0.7x)</span>
                            <span>Normal (1.0x)</span>
                            <span>Faster (1.4x)</span>
                        </div>
                    </div>

                    {/* Interactive Help Hint */}
                    <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-2.5 text-[10px] text-slate-400 leading-relaxed">
                        <span className="font-bold text-purple-400 block mb-0.5">💡 Interactive Voice Assistant:</span>
                        Say <span className="text-white font-mono">&quot;Solve 2x + 6 = 18&quot;</span> or <span className="text-white font-mono">&quot;Explain Pythagoras theorem&quot;</span> to hear the AI speak solutions aloud!
                    </div>
                </div>
            )}
        </div>
    );
}
