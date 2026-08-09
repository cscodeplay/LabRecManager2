'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Users, User, Mic, MicOff, Video, VideoOff, UserMinus, Circle, ChevronDown, Check } from 'lucide-react';

export default function WhiteboardChatWindow({
    socket,
    sessionId,
    currentUser = { name: 'User', role: 'student' },
    isInstructor = false,
    availableGroups = [], // Represents sharingTargets (invited)
    onClose = () => {},
    onManagePermissions
}) {
    const [view, setView] = useState('participants'); // 'participants' or 'chat'
    const [activeTarget, setActiveTarget] = useState('Everyone');
    const [messages, setMessages] = useState([]);
    const [inputMsg, setInputMsg] = useState('');
    const [participants, setParticipants] = useState([]);
    const [myStatus, setMyStatus] = useState('Online');
    const [showStatusMenu, setShowStatusMenu] = useState(false);

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

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!inputMsg.trim() || !sessionId) return;

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
        
        setMessages((prev) => [...prev, msgData]);
        setInputMsg('');
    };

    const handleRemoveParticipant = (targetUserId) => {
        if (!socket || !sessionId) return;
        if (confirm('Remove this participant from the live classroom?')) {
            socket.emit('whiteboard:remove-participant', { sessionId, targetUserId });
        }
    };

    const changeStatus = (newStatus) => {
        setMyStatus(newStatus);
        setShowStatusMenu(false);
        if (socket && sessionId) {
            socket.emit('whiteboard:user-status', { sessionId, status: newStatus });
        }
    };

    const getStatusColor = (status) => {
        switch(status) {
            case 'Online': return 'text-emerald-500 bg-emerald-500';
            case 'Away': return 'text-amber-500 bg-amber-500';
            case 'Busy': return 'text-red-500 bg-red-500';
            default: return 'text-slate-400 bg-slate-400';
        }
    };

    // Calculate offline targets (invited but not in live participants)
    const offlineTargets = availableGroups.filter(g => !participants.some(p => p.name === g.name));
    
    // Filter out the host themselves from the student view if needed, but for now we list everyone
    const liveCount = participants.length;
    const offlineCount = offlineTargets.length;
    const totalCount = liveCount + offlineCount;

    return (
        <div className="fixed right-0 top-0 h-full w-80 bg-white/95 backdrop-blur-xl border-l border-slate-200 shadow-2xl flex flex-col z-[60] animate-fade-in font-sans">
            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-slate-700" />
                    <span className="font-semibold text-slate-800 text-sm">Meeting Panel</span>
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={onClose} className="p-1.5 hover:bg-slate-200 rounded-lg transition text-slate-500" title="Close Panel">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* My Status Controls */}
            <div className="px-4 py-2 border-b border-slate-100 relative">
                <button 
                    onClick={() => setShowStatusMenu(!showStatusMenu)}
                    className="flex items-center justify-between w-full p-2 hover:bg-slate-50 rounded-lg transition text-sm"
                >
                    <div className="flex items-center gap-2">
                        <div className="relative flex h-2.5 w-2.5">
                            <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${getStatusColor(myStatus).split(' ')[1]}`}></span>
                            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${getStatusColor(myStatus).split(' ')[1]}`}></span>
                        </div>
                        <span className="font-medium text-slate-700">{currentUser.name || 'Me'}</span>
                        <span className="text-slate-400 text-xs">({myStatus})</span>
                    </div>
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                {showStatusMenu && (
                    <div className="absolute top-12 left-4 right-4 bg-white border border-slate-200 rounded-xl shadow-lg z-50 p-1 py-1 text-sm overflow-hidden animate-fade-in">
                        {['Online', 'Away', 'Busy', 'Offline'].map(st => (
                            <button 
                                key={st} 
                                onClick={() => changeStatus(st)}
                                className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                            >
                                <Circle className={`w-2 h-2 fill-current ${getStatusColor(st).split(' ')[0]}`} />
                                <span className="flex-1">{st}</span>
                                {myStatus === st && <Check className="w-3 h-3 text-primary-500" />}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200">
                <button 
                    onClick={() => setView('participants')}
                    className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wider transition-colors ${view === 'participants' ? 'text-primary-600 border-b-2 border-primary-500' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                >
                    Participants ({totalCount})
                </button>
                <button 
                    onClick={() => setView('chat')}
                    className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wider transition-colors ${view === 'chat' ? 'text-primary-600 border-b-2 border-primary-500' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                >
                    Chat
                </button>
            </div>

            {view === 'participants' ? (
                /* Participants List View */
                <div className="flex-1 overflow-y-auto">
                    <div className="px-4 py-2 flex justify-end">
                        {isInstructor && onManagePermissions && (
                            <button 
                                onClick={onManagePermissions}
                                className="text-xs font-medium bg-primary-50 text-primary-600 hover:bg-primary-100 px-3 py-1.5 rounded-md flex items-center gap-1 transition"
                            >
                                <Users className="w-3.5 h-3.5" />
                                Manage Permissions
                            </button>
                        )}
                    </div>

                    {/* Active/Live */}
                    <div className="px-4 py-3">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Active ({liveCount})</p>
                        <div className="space-y-1">
                            {participants.map(p => (
                                <div key={p.id} className="w-full p-2 rounded-lg flex items-center justify-between hover:bg-slate-50 group cursor-pointer" onClick={() => { setActiveTarget(p.name); setView('chat'); }}>
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                                                <User className="w-4 h-4 text-slate-500" />
                                            </div>
                                            <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${getStatusColor(p.status || 'Online').split(' ')[1]}`}></div>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-slate-800">{p.name} {p.name === currentUser.name ? '(Me)' : ''}</span>
                                            <span className="text-[10px] text-slate-500">{p.role === 'instructor' ? 'Host' : (p.status || 'Live')}</span>
                                        </div>
                                    </div>
                                    {isInstructor && p.role !== 'instructor' && (
                                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button title={p.isMicOn ? "Mic On" : "Mic Off"} className="p-1 rounded text-slate-400 cursor-default">
                                                {p.isMicOn ? <Mic className="w-3.5 h-3.5 text-emerald-500" /> : <MicOff className="w-3.5 h-3.5" />}
                                            </button>
                                            <button title={p.isCameraOn ? "Cam On" : "Cam Off"} className="p-1 rounded text-slate-400 cursor-default">
                                                {p.isCameraOn ? <Video className="w-3.5 h-3.5 text-emerald-500" /> : <VideoOff className="w-3.5 h-3.5" />}
                                            </button>
                                            <button onClick={() => handleRemoveParticipant(p.id)} title="Remove Participant" className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 transition">
                                                <UserMinus className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Inactive / Not Joined */}
                    {offlineTargets.length > 0 && (
                        <div className="px-4 py-3">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Inactive / Invited ({offlineCount})</p>
                            <div className="space-y-1">
                                {offlineTargets.map(g => (
                                    <div key={g.id} className="w-full p-2 rounded-lg flex items-center justify-between opacity-60 grayscale cursor-pointer" onClick={() => { setActiveTarget(g.name); setView('chat'); }}>
                                        <div className="flex items-center gap-3">
                                            <div className="relative">
                                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                                                    <User className="w-4 h-4 text-slate-400" />
                                                </div>
                                                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white bg-slate-300"></div>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-slate-600 line-through">{g.name}</span>
                                                <span className="text-[10px] text-slate-400">Not Joined</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                /* Chat View */
                <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/30">
                    <div className="p-3 bg-white border-b border-slate-100 shadow-sm z-10 flex items-center justify-between">
                         <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">To:</span>
                         <select 
                            value={activeTarget} 
                            onChange={(e) => setActiveTarget(e.target.value)}
                            className="text-xs bg-slate-100 border-none rounded-lg py-1 px-2 font-medium text-slate-700 outline-none focus:ring-2 focus:ring-primary-500/20 cursor-pointer"
                         >
                            <option value="Everyone">Everyone</option>
                            {participants.filter(p => p.name !== currentUser.name).map(p => (
                                <option key={p.id} value={p.name}>{p.name}</option>
                            ))}
                         </select>
                    </div>
                    
                    <div className="flex-1 p-4 overflow-y-auto space-y-4 text-sm">
                        {messages.length === 0 ? (
                            <div className="text-center py-12 text-slate-400 flex flex-col items-center">
                                <MessageSquare className="w-10 h-10 mb-3 opacity-20" />
                                <p className="font-medium">No messages yet.</p>
                                <p className="text-xs mt-1">Say hello to {activeTarget}!</p>
                            </div>
                        ) : (
                            messages.map((m, idx) => {
                                const isMe = m.sender === currentUser.name;
                                return (
                                    <div key={idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                        <div className="flex items-center gap-1.5 mb-1 px-1">
                                            <span className="font-medium text-[11px] text-slate-500">{isMe ? 'Me' : m.sender}</span>
                                            {m.role === 'instructor' && !isMe && (
                                                <span className="bg-amber-100 text-amber-700 font-bold px-1.5 py-0.5 rounded-[4px] text-[9px]">HOST</span>
                                            )}
                                            <span className="text-[10px] text-slate-400">
                                                {(() => {
                                                    if (!m.timestamp) return '';
                                                    if (typeof m.timestamp === 'string' && m.timestamp.includes(':') && !m.timestamp.includes('T')) return m.timestamp;
                                                    const d = new Date(m.timestamp);
                                                    return isNaN(d.getTime()) ? m.timestamp : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                                })()}
                                            </span>
                                        </div>
                                        <div className={`px-4 py-2 rounded-2xl max-w-[85%] break-words leading-relaxed shadow-sm ${
                                            isMe
                                                ? 'bg-primary-500 text-white rounded-tr-sm'
                                                : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm'
                                        }`}>
                                            {m.text}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-200">
                        <div className="relative flex items-center">
                            <input
                                type="text"
                                value={inputMsg}
                                onChange={(e) => setInputMsg(e.target.value)}
                                placeholder={sessionId ? "Type a message..." : "Waiting to connect..."}
                                disabled={!sessionId}
                                className="w-full pl-4 pr-10 py-2.5 bg-slate-100 border border-transparent hover:border-slate-200 rounded-full text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary-500/30 text-slate-800 disabled:opacity-50 transition-all"
                            />
                            <button
                                type="submit"
                                disabled={!inputMsg.trim() || !sessionId}
                                className="absolute right-1.5 p-1.5 bg-primary-500 hover:bg-primary-600 disabled:bg-slate-300 disabled:opacity-50 text-white rounded-full transition shadow-sm"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
