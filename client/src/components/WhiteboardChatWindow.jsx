'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Users, ChevronDown, ChevronUp, GripHorizontal } from 'lucide-react';

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
    const [messages, setMessages] = useState([]);
    const [inputMsg, setInputMsg] = useState('');
    const [position, setPosition] = useState({ x: 20, y: 100 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [showGroups, setShowGroups] = useState(false);

    const chatRef = useRef(null);
    const messagesEndRef = useRef(null);

    // Auto scroll chat to bottom
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Socket message listener
    useEffect(() => {
        if (!socket || !sessionId) return;

        const handleChatMessage = (data) => {
            if (data.sessionId !== sessionId) return;
            setMessages((prev) => [...prev, data]);
        };

        socket.on('whiteboard:chat-message', handleChatMessage);

        return () => {
            socket.off('whiteboard:chat-message', handleChatMessage);
        };
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
        if (!inputMsg.trim() || !socket || !sessionId) return;

        const msgData = {
            sessionId,
            sender: currentUser.name || (isInstructor ? 'Instructor' : 'Student'),
            role: isInstructor ? 'instructor' : 'student',
            text: inputMsg.trim(),
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        socket.emit('whiteboard:chat-message', msgData);
        setMessages((prev) => [...prev, msgData]);
        setInputMsg('');
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 z-40 p-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-full shadow-2xl flex items-center gap-2 font-medium text-sm transition hover:scale-105"
                title="Open Whiteboard Chat & Audience"
            >
                <MessageSquare className="w-5 h-5" />
                <span className="hidden sm:inline">Whiteboard Chat</span>
                {messages.length > 0 && (
                    <span className="w-5 h-5 bg-red-500 text-white rounded-full text-xs font-bold flex items-center justify-center">
                        {messages.length}
                    </span>
                )}
            </button>
        );
    }

    return (
        <div
            ref={chatRef}
            style={{ left: `${position.x}px`, top: `${position.y}px` }}
            className="fixed z-50 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden select-none"
        >
            {/* Header / Drag Bar */}
            <div
                onMouseDown={handleMouseDown}
                className="p-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white flex items-center justify-between cursor-move"
            >
                <div className="flex items-center gap-2 font-bold text-sm">
                    <GripHorizontal className="w-4 h-4 opacity-70" />
                    <MessageSquare className="w-4 h-4" />
                    <span>Whiteboard Live Chat</span>
                </div>
                <div className="flex items-center gap-1 no-drag">
                    {isInstructor && availableGroups.length > 0 && (
                        <button
                            onClick={() => setShowGroups(!showGroups)}
                            className="p-1 hover:bg-white/20 rounded transition text-xs flex items-center gap-1"
                            title="Toggle Audience Groups"
                        >
                            <Users className="w-3.5 h-3.5" />
                            {showGroups ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                    )}
                    <button
                        onClick={() => setIsOpen(false)}
                        className="p-1 hover:bg-white/20 rounded transition"
                        title="Minimize Chat"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Audience Groups Dropdown (For Instructor) */}
            {showGroups && isInstructor && availableGroups.length > 0 && (
                <div className="p-3 bg-amber-50 border-b border-amber-200 no-drag space-y-2">
                    <p className="text-xs font-bold text-amber-900 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-amber-600" />
                        Target Audience Groups ({selectedGroupIds.length} Selected)
                    </p>
                    <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                        {availableGroups.map((g) => {
                            const isSelected = selectedGroupIds.includes(g.id);
                            return (
                                <button
                                    key={g.id}
                                    onClick={() => onToggleGroupSelection(g.id)}
                                    className={`px-2.5 py-1 rounded-full text-xs font-semibold transition ${
                                        isSelected
                                            ? 'bg-amber-500 text-white shadow-xs'
                                            : 'bg-white border border-amber-200 text-amber-800 hover:bg-amber-100'
                                    }`}
                                >
                                    {g.name}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Messages Body */}
            <div className="flex-1 p-3 overflow-y-auto space-y-3 max-h-72 min-h-[180px] bg-slate-50 no-drag text-xs">
                {messages.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                        <MessageSquare className="w-8 h-8 mx-auto mb-1 opacity-40" />
                        <p>No messages yet.</p>
                        <p className="text-[11px] text-slate-400">Type a message to chat with classroom.</p>
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
                                    <span>• {m.timestamp}</span>
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
                    placeholder="Type a message..."
                    className="flex-1 px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-full text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-800"
                />
                <button
                    type="submit"
                    disabled={!inputMsg.trim()}
                    className="p-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white rounded-full transition shadow-xs"
                    title="Send Message"
                >
                    <Send className="w-3.5 h-3.5" />
                </button>
            </form>
        </div>
    );
}
