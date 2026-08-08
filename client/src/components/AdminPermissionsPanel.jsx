import React, { useState, useEffect } from 'react';
import { Users, X, Mic, Video, Pencil, MicOff, VideoOff, PencilOff } from 'lucide-react';

const AdminPermissionsPanel = ({ socket, sessionId, isOpen, onClose }) => {
    const [students, setStudents] = useState([]);

    useEffect(() => {
        if (!isOpen || !socket || !sessionId) return;

        // Request student list
        socket.emit('whiteboard:get-participants', { sessionId });

        const handleParticipants = (data) => {
            // data.participants is [{ id, name, permissions: { canDraw, canShareAudio, canShareVideo } }]
            setStudents(data.participants.filter(p => p.role === 'student'));
        };

        socket.on('whiteboard:participants-list', handleParticipants);

        return () => {
            socket.off('whiteboard:participants-list', handleParticipants);
        };
    }, [isOpen, socket, sessionId]);

    const togglePermission = (studentId, permissionType) => {
        const student = students.find(s => s.id === studentId);
        if (!student) return;

        const updatedPermissions = {
            ...student.permissions,
            [permissionType]: !student.permissions[permissionType]
        };

        socket.emit('whiteboard:update-permissions', {
            sessionId,
            targetUserId: studentId,
            permissions: updatedPermissions
        });

        // Optimistically update
        setStudents(students.map(s => s.id === studentId ? { ...s, permissions: updatedPermissions } : s));
    };

    if (!isOpen) return null;

    return (
        <div className="absolute top-20 right-4 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-50 flex flex-col">
            <div className="bg-slate-800 text-white p-3 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    <span className="font-medium">Manage Students</span>
                </div>
                <button onClick={onClose} className="hover:bg-slate-700 p-1 rounded transition-colors">
                    <X className="w-4 h-4" />
                </button>
            </div>
            
            <div className="p-4 max-h-96 overflow-y-auto">
                {students.length === 0 ? (
                    <div className="text-slate-500 text-center py-4 text-sm">
                        No students connected.
                    </div>
                ) : (
                    <div className="space-y-4">
                        {students.map(student => (
                            <div key={student.id} className="flex flex-col gap-2 p-3 bg-slate-50 rounded-lg border border-slate-100">
                                <span className="font-medium text-slate-800 text-sm truncate" title={student.name}>
                                    {student.name}
                                </span>
                                
                                <div className="flex items-center justify-between gap-2">
                                    <button
                                        onClick={() => togglePermission(student.id, 'canDraw')}
                                        className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                                            student.permissions.canDraw 
                                            ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200' 
                                            : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                                        }`}
                                    >
                                        {student.permissions.canDraw ? <Pencil className="w-3.5 h-3.5" /> : <PencilOff className="w-3.5 h-3.5" />}
                                        Draw
                                    </button>
                                    
                                    <button
                                        onClick={() => togglePermission(student.id, 'canShareAudio')}
                                        className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                                            student.permissions.canShareAudio 
                                            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' 
                                            : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                                        }`}
                                    >
                                        {student.permissions.canShareAudio ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
                                        Mic
                                    </button>
                                    
                                    <button
                                        onClick={() => togglePermission(student.id, 'canShareVideo')}
                                        className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                                            student.permissions.canShareVideo 
                                            ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                                            : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                                        }`}
                                    >
                                        {student.permissions.canShareVideo ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
                                        Cam
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminPermissionsPanel;
