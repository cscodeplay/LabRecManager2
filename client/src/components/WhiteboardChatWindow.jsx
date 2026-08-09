'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Users, ChevronDown, ChevronUp, GripHorizontal, ArrowLeft, User, Mic, MicOff, Video, VideoOff, UserMinus } from 'lucide-react';

export default function WhiteboardChatWindow({
    socket,
    sessionId,
    currentUser = { name: 'User', role: 'student' },
    isInstructor = false,
    availableGroups = [],
    selectedGroupIds = [],
    onToggleGroupSelection = () => {}
}) {
    const [isOpen, setIsOpen] = useState(false);
    // 'participants' or 'chat'
    const [view, setView] = useState('participants');
    const [activeTarget, setActiveTarget] = useState('Everyone');
    const [messages, setMessages] = useState([]);
    const [inputMsg, setInputMsg] = useState('');
    const [position, setPosition] = useState({ x: 20, y: 100 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [participants, setParticipants] = useState([]);

    const chatRef = useRef(null);
    const messagesEndRef = useRef(null);

    // Auto scroll chat to bottom
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (view === 'chat') {
            scrollToBottom();
        }
    }, [messages, view]);

    // Socket message listener
    useEffect(() => {
        if (!socket) return;

        const handleChatMessage = (data) => {
            if (sessionId && data.sessionId !== sessionId) return;
            
            // Client-side filtering for privacy routing
            if (!isInstructor && data.target !== 'Everyone' && data.target !== currentUser.name) {
                // If it's a student, and message isn't for Everyone or them specifically, ignore it.
                // Note: If they belong to a group, we would ideally check if data.target matches their group name.
                // For now, assume groups are handled or strict filtering blocks it.
                return;
            }
            
            setMessages((prev) => [...prev, data]);
        };
        
        const handleChatHistory = (history) => {
            setMessages(history || []);
        };

        const handleParticipantsUpdate = (data) => {
            setParticipants(data.participants || []);
        };

        socket.on('whiteboard:chat-message', handleChatMessage);
        socket.on('whiteboard:chat-history', handleChatHistory);
        socket.on('whiteboard:participants-update', handleParticipantsUpdate);

        return () => {
            socket.off('whiteboard:chat-message', handleChatMessage);
            socket.off('whiteboard:chat-history', handleChatHistory);
            socket.off('whiteboard:participants-update', handleParticipantsUpdate);
        };
    }, [socket, sessionId, isInstructor, currentUser]);
    
    useEffect(() => {
        if (socket && sessionId) {
            socket.emit('whiteboard:request-chat-history', { sessionId });
        } else {
            setMessages([]);
        }
    }, [socket, sessionId]);

    // Drag handlers
    const handleMouseDown = (e) => {
        if (e.target.closest('.no-drag')) return;
        setIsDragging(true);
        setDragOffset({
            x: e.clientX - position.x,
            y: e.clientY - position.y
        });
    };

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isDragging) return;
            setPosition({
                x: Math.max(10, Math.min(window.innerWidth - 340, e.clientX - dragOffset.x)),
                y: Math.max(10, Math.min(window.innerHeight - 400, e.clientY - dragOffset.y))
            });
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, dragOffset]);

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!inputMsg.trim() || !sessionId) return; // Prevent sending if offline

        const msgData = {
            sessionId: sessionId,
            sender: currentUser.name || (isInstructor ? 'Instructor' : 'Student'),
            role: isInstructor ? 'instructor' : 'student',
            target: activeTarget,
            text: inputMsg.trim(),
            timestamp: new Date().toISOString()
        };

        if (socket && sessionId) {
            socket.emit('whiteboard:chat-message', msgData);
        }
        
        // Optimistic UI update
        setMessages((prev) => [...prev, msgData]);
        setInputMsg('');
    };

    const handleSelectTarget = (targetName) => {
        setActiveTarget(targetName);
        setView('chat');
    };

    const handleRemoveParticipant = (targetUserId) => {
        if (!socket || !sessionId) return;
        if (confirm('Remove this participant from the live classroom?')) {
            socket.emit('whiteboard:remove-participant', { sessionId, targetUserId });
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-24 right-6 z-[60] p-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-full shadow-2xl flex items-center justify-center transition hover:scale-105"
                title="Open Whiteboard Chat & Audience"
            >
                <MessageSquare className="w-5 h-5" />
                {messages.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs font-bold flex items-center justify-center border-2 border-white">
                        {messages.length}
                    </span>
                )}
            </button>
        );
    }

    const groupList = availableGroups;

    return (
        <div
            ref={chatRef}
            style={{ left: `${position.x}px`, top: `${position.y}px` }}
            className="fixed z-[60] w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden select-none"
        >
            {/* Header / Drag Bar */}
            <div
                onMouseDown={handleMouseDown}
                className="p-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white flex items-center justify-between cursor-move"
            >
                <div className="flex items-center gap-2 font-bold text-sm">
                    {view === 'chat' ? (
                        <button 
                            onClick={() => setView('participants')}
                            className="p-1 hover:bg-white/20 rounded transition no-drag"
                            title="Back to Participants"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </button>
                    ) : (
                        <GripHorizontal className="w-4 h-4 opacity-70" />
                    )}
                    <MessageSquare className="w-4 h-4" />
                    <span>{view === 'chat' ? `Chat: ${activeTarget}` : 'Participants & Chat'}</span>
                </div>
                <div className="flex items-center gap-1 no-drag">
                    <button
                        onClick={() => setIsOpen(false)}
                        className="p-1 hover:bg-white/20 rounded transition"
                        title="Minimize Window"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {view === 'participants' ? (
                /* Participants List View */
                <div className="flex-1 bg-slate-50 overflow-y-auto no-drag flex flex-col max-h-[400px] min-h-[300px]">
                    <div className="p-3 border-b border-slate-200 bg-white">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Broadcast</p>
                        <button 
                            onClick={() => handleSelectTarget('Everyone')}
                            className="w-full text-left p-2 hover:bg-amber-50 rounded-lg flex items-center gap-3 transition"
                        >
                            <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
                                <Users className="w-4 h-4" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-semibold text-slate-800">Everyone</p>
                                <p className="text-xs text-slate-500">Send to all students</p>
                            </div>
                        </button>
                    </div>

                    {groupList.length > 0 && (
                        <div className="p-3 bg-white flex-1 border-b border-slate-200">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Groups / Students</p>
                            <div className="space-y-1">
                                {groupList.map(g => (
                                    <button
                                        key={g.id}
                                        onClick={() => handleSelectTarget(g.name)}
                                        className="w-full text-left p-2 hover:bg-amber-50 rounded-lg flex items-center gap-3 transition"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center border border-slate-200">
                                            <Users className="w-4 h-4" />
                                        </div>
                                        <span className="text-sm font-medium text-slate-700">{g.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {isInstructor && participants.length > 0 && (
                        <div className="p-3 bg-white flex-1">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Live Participants ({participants.length})</p>
                            <div className="space-y-1">
                                {participants.map(p => (
                                    <div key={p.id} className="w-full p-2 rounded-lg flex items-center justify-between transition hover:bg-slate-50 border border-transparent hover:border-slate-100">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                                                <User className="w-3 h-3" />
                                            </div>
                                            <span className="text-sm font-medium text-slate-700">{p.name}</span>
                                        </div>
                                        {p.role !== 'host' && (
                                            <div className="flex items-center gap-1">
                                                <button title={p.isMicOn ? "Mic On" : "Mic Off"} className="p-1 rounded text-slate-400 cursor-default">
                                                    {p.isMicOn ? <Mic className="w-3.5 h-3.5 text-emerald-500" /> : <MicOff className="w-3.5 h-3.5" />}
                                                </button>
                                                <button title={p.isCameraOn ? "Cam On" : "Cam Off"} className="p-1 rounded text-slate-400 cursor-default">
                                                    {p.isCameraOn ? <Video className="w-3.5 h-3.5 text-emerald-500" /> : <VideoOff className="w-3.5 h-3.5" />}
                                                </button>
                                                <button onClick={() => handleRemoveParticipant(p.id)} title="Remove Participant" className="p-1 rounded hover:bg-red-100 text-slate-400 hover:text-red-600 transition">
                                                    <UserMinus className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                /* Chat View */
                <>
                    {/* Messages Body */}
                    <div className="flex-1 p-3 overflow-y-auto space-y-3 max-h-72 min-h-[250px] bg-slate-50 no-drag text-xs">
                        {messages.length === 0 ? (
                            <div className="text-center py-8 text-slate-400">
                                <MessageSquare className="w-8 h-8 mx-auto mb-1 opacity-40" />
                                <p>No messages yet.</p>
                                <p className="text-[11px] text-slate-400">Start the conversation with {activeTarget}.</p>
                            </div>
                        ) : (
                            messages.map((m, idx) => {
                                const isMe = m.sender === currentUser.name;
                                return (
                                    <div
                                        key={idx}
                                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                                    >
                                        <div className="flex items-center gap-1 text-[10px] text-slate-400 mb-0.5 px-1">
                                            <span className="font-semibold text-slate-600">{m.sender}</span>
                                            {m.role === 'instructor' && (
                                                <span className="bg-amber-100 text-amber-800 font-bold px-1 rounded text-[9px]">HOST</span>
                                            )}
                                            <span>• {(() => {
                                                if (!m.timestamp) return '';
                                                if (typeof m.timestamp === 'string' && m.timestamp.includes(':') && !m.timestamp.includes('T')) {
                                                    return m.timestamp;
                                                }
                                                const d = new Date(m.timestamp);
                                                return isNaN(d.getTime()) ? m.timestamp : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                            })()}</span>
                                        </div>
                                        <div
                                            className={`px-3 py-2 rounded-2xl max-w-[85%] break-words ${
                                                isMe
                                                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-br-none'
                                                    : 'bg-white border border-slate-200 text-slate-800 shadow-2xs rounded-bl-none'
                                            }`}
                                        >
                                            {m.text}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Message Input Box */}
                    <form onSubmit={handleSendMessage} className="p-2 bg-white border-t border-slate-200 flex items-center gap-2 no-drag">
                        <input
                            type="text"
                            value={inputMsg}
                            onChange={(e) => setInputMsg(e.target.value)}
                            placeholder={sessionId ? `Message ${activeTarget}...` : "Waiting for Live Sharing..."}
                            disabled={!sessionId}
                            className="flex-1 px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-full text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-800 disabled:opacity-50"
                        />
                        <button
                            type="submit"
                            disabled={!inputMsg.trim() || !sessionId}
                            className="p-2 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 disabled:opacity-40 text-white rounded-full transition shadow-xs"
                            title="Send Message"
                        >
                            <Send className="w-3.5 h-3.5" />
                        </button>
                    </form>
                </>
            )}
        </div>
    );
}
