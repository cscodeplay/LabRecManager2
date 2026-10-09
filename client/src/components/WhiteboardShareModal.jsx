'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Users, UsersRound, User, Search, Share2, Square, Pencil, Mic, Video, MessageSquare, Download, Layers, ShieldCheck, Check, Sparkles, Image as ImageIcon } from 'lucide-react';
import { classesAPI } from '@/lib/api';
import toast from 'react-hot-toast';

export default function WhiteboardShareModal({
    isOpen,
    onClose,
    onStartSharing,
    onStopSharing,
    onUpdatePermissions,
    isSharing = false,
    currentTargets = [],
    currentPermissions = null
}) {
    const [classes, setClasses] = useState([]);
    const [selectedClass, setSelectedClass] = useState('');
    const [groups, setGroups] = useState([]);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(false);

    // Selection state
    const [targetType, setTargetType] = useState('class'); // class, group, student
    const [selectedTargets, setSelectedTargets] = useState([]);
    const [studentSearch, setStudentSearch] = useState('');

    // Scheduling state
    const [isScheduled, setIsScheduled] = useState(false);
    const [scheduledAt, setScheduledAt] = useState('');
    const [durationMinutes, setDurationMinutes] = useState(60);

    // Zoom/Teams-grade collaboration permissions
    const [permissions, setPermissions] = useState({
        canDraw: true,
        canClearBoard: false,
        canUploadMedia: false,
        canShareAudio: false,
        canShareVideo: false,
        canChat: true,
        canExport: true,
        canManagePages: false,
        showAnnotatorNames: true
    });

    useEffect(() => {
        if (currentPermissions) {
            setPermissions(prev => ({ ...prev, ...currentPermissions }));
        }
    }, [currentPermissions]);

    useEffect(() => {
        if (isOpen) {
            loadClasses();
        }
    }, [isOpen]);

    useEffect(() => {
        if (selectedClass) {
            loadClassData(selectedClass);
        }
    }, [selectedClass]);

    const loadClasses = async () => {
        try {
            const res = await classesAPI.getAll();
            setClasses(res.data.data.classes || []);
        } catch (error) {
            console.error('Failed to load classes:', error);
        }
    };

    const loadClassData = async (classId) => {
        setLoading(true);
        try {
            const [studentsRes, groupsRes] = await Promise.all([
                classesAPI.getStudents(classId),
                classesAPI.getGroups(classId)
            ]);
            setStudents(studentsRes.data.data.students || []);
            setGroups(groupsRes.data.data.groups || []);
        } catch (error) {
            console.error('Failed to load class data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleTargetSelect = (id) => {
        if (targetType === 'class') {
            // Single class selection for class type
            setSelectedTargets([id]);
        } else {
            // Multi-select for groups and students
            setSelectedTargets(prev =>
                prev.includes(id)
                    ? prev.filter(t => t !== id)
                    : [...prev, id]
            );
        }
    };

    const handleStartSharing = () => {
        if (selectedTargets.length === 0) {
            toast.error('Please select at least one target');
            return;
        }

        const shareData = {
            targetType,
            targets: selectedTargets,
            classId: selectedClass,
            permissions,
            ...(isScheduled && scheduledAt ? { scheduledAt, durationMinutes } : {})
        };

        // Build target names for display
        let targetNames = [];
        if (targetType === 'class') {
            const cls = classes.find(c => c.id === selectedTargets[0]);
            targetNames = [cls?.name || 'Class'];
        } else if (targetType === 'group') {
            targetNames = groups
                .filter(g => selectedTargets.includes(g.id))
                .map(g => g.name);
        } else {
            targetNames = students
                .filter(s => selectedTargets.includes(s.id))
                .map(s => `${s.firstName} ${s.lastName}`);
        }

        onStartSharing({
            ...shareData,
            targetNames
        });
    };

    const filteredStudents = students.filter(s =>
        s.firstName?.toLowerCase().includes(studentSearch.toLowerCase()) ||
        s.lastName?.toLowerCase().includes(studentSearch.toLowerCase()) ||
        s.studentId?.toLowerCase().includes(studentSearch.toLowerCase())
    );

    const renderPermissionsControls = () => (
        <div className="space-y-3">
            {/* Annotation & Drawing */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2 mb-2 font-semibold text-xs text-slate-700 uppercase tracking-wider">
                    <Pencil className="w-3.5 h-3.5 text-amber-500" />
                    Annotation & Content
                </div>
                <div className="space-y-2">
                    <label className="flex items-center justify-between text-sm text-slate-700 cursor-pointer select-none">
                        <span className="flex items-center gap-1.5">
                            <span className="font-medium">Allow Drawing & Writing</span>
                            <span className="text-xs text-slate-400">(Pen, highlighter, shapes, text)</span>
                        </span>
                        <input type="checkbox" checked={permissions.canDraw} onChange={e => setPermissions({...permissions, canDraw: e.target.checked})} className="rounded text-amber-500 focus:ring-amber-500 w-4 h-4" />
                    </label>
                    <label className="flex items-center justify-between text-sm text-slate-700 cursor-pointer select-none">
                        <span className="flex items-center gap-1.5">
                            <span className="font-medium">Allow Inserting Media</span>
                            <span className="text-xs text-slate-400">(Upload images, PDFs, 3D)</span>
                        </span>
                        <input type="checkbox" checked={permissions.canUploadMedia} onChange={e => setPermissions({...permissions, canUploadMedia: e.target.checked})} className="rounded text-amber-500 focus:ring-amber-500 w-4 h-4" />
                    </label>
                    <label className="flex items-center justify-between text-sm text-slate-700 cursor-pointer select-none">
                        <span className="flex items-center gap-1.5">
                            <span className="font-medium">Allow Clearing Board</span>
                            <span className="text-xs text-rose-400">(Host only recommended)</span>
                        </span>
                        <input type="checkbox" checked={permissions.canClearBoard} onChange={e => setPermissions({...permissions, canClearBoard: e.target.checked})} className="rounded text-amber-500 focus:ring-amber-500 w-4 h-4" />
                    </label>
                </div>
            </div>

            {/* Media & Communication */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2 mb-2 font-semibold text-xs text-slate-700 uppercase tracking-wider">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                    Media & Communication
                </div>
                <div className="space-y-2">
                    <label className="flex items-center justify-between text-sm text-slate-700 cursor-pointer select-none">
                        <span className="flex items-center gap-1.5">
                            <Mic className="w-3.5 h-3.5 text-emerald-500" />
                            <span className="font-medium">Allow Microphone</span>
                        </span>
                        <input type="checkbox" checked={permissions.canShareAudio} onChange={e => setPermissions({...permissions, canShareAudio: e.target.checked})} className="rounded text-amber-500 focus:ring-amber-500 w-4 h-4" />
                    </label>
                    <label className="flex items-center justify-between text-sm text-slate-700 cursor-pointer select-none">
                        <span className="flex items-center gap-1.5">
                            <Video className="w-3.5 h-3.5 text-blue-500" />
                            <span className="font-medium">Allow Camera</span>
                        </span>
                        <input type="checkbox" checked={permissions.canShareVideo} onChange={e => setPermissions({...permissions, canShareVideo: e.target.checked})} className="rounded text-amber-500 focus:ring-amber-500 w-4 h-4" />
                    </label>
                    <label className="flex items-center justify-between text-sm text-slate-700 cursor-pointer select-none">
                        <span className="flex items-center gap-1.5">
                            <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />
                            <span className="font-medium">Allow In-Session Chat</span>
                        </span>
                        <input type="checkbox" checked={permissions.canChat} onChange={e => setPermissions({...permissions, canChat: e.target.checked})} className="rounded text-amber-500 focus:ring-amber-500 w-4 h-4" />
                    </label>
                </div>
            </div>

            {/* Presentation & Controls */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2 mb-2 font-semibold text-xs text-slate-700 uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5 text-violet-500" />
                    Viewer & Export Controls
                </div>
                <div className="space-y-2">
                    <label className="flex items-center justify-between text-sm text-slate-700 cursor-pointer select-none">
                        <span className="flex items-center gap-1.5">
                            <Download className="w-3.5 h-3.5 text-slate-500" />
                            <span className="font-medium">Allow Save & Export</span>
                            <span className="text-xs text-slate-400">(PDF, PNG, screenshot)</span>
                        </span>
                        <input type="checkbox" checked={permissions.canExport} onChange={e => setPermissions({...permissions, canExport: e.target.checked})} className="rounded text-amber-500 focus:ring-amber-500 w-4 h-4" />
                    </label>
                    <label className="flex items-center justify-between text-sm text-slate-700 cursor-pointer select-none">
                        <span className="flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-slate-500" />
                            <span className="font-medium">Allow Page Navigation</span>
                            <span className="text-xs text-slate-400">(Off: Follow Host)</span>
                        </span>
                        <input type="checkbox" checked={permissions.canManagePages} onChange={e => setPermissions({...permissions, canManagePages: e.target.checked})} className="rounded text-amber-500 focus:ring-amber-500 w-4 h-4" />
                    </label>
                    <label className="flex items-center justify-between text-sm text-slate-700 cursor-pointer select-none">
                        <span className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-slate-500" />
                            <span className="font-medium">Show Annotator Names on Cursor</span>
                        </span>
                        <input type="checkbox" checked={permissions.showAnnotatorNames} onChange={e => setPermissions({...permissions, showAnnotatorNames: e.target.checked})} className="rounded text-amber-500 focus:ring-amber-500 w-4 h-4" />
                    </label>
                </div>
            </div>
        </div>
    );

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col shadow-2xl">
                {/* Header */}
                <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-amber-500 to-orange-500">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                            <Share2 className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-white">Share Whiteboard</h2>
                            <p className="text-sm text-white/80">
                                {isSharing ? 'Currently sharing live' : 'Choose who can view your whiteboard'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/20 rounded-lg transition text-white"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-auto p-4">
                    {isSharing ? (
                        /* Currently Sharing View with Live Permission Management */
                        <div className="space-y-4">
                            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="relative flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-900">Whiteboard is Live!</h3>
                                        <p className="text-xs text-slate-600">
                                            Sharing with: <span className="font-semibold text-amber-800">{currentTargets.length > 0 ? currentTargets.join(', ') : 'Active viewers'}</span>
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={onStopSharing}
                                    className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
                                >
                                    <Square className="w-3.5 h-3.5" />
                                    Stop Sharing
                                </button>
                            </div>

                            <div>
                                <h4 className="text-sm font-bold text-slate-800 mb-1">Live Participant Permissions</h4>
                                <p className="text-xs text-slate-500 mb-3">Adjust permissions for all connected viewers in real time:</p>
                                {renderPermissionsControls()}
                            </div>

                            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                                <button
                                    onClick={() => {
                                        onUpdatePermissions?.(permissions);
                                        toast.success('Live permissions updated for all viewers!');
                                        onClose();
                                    }}
                                    className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm transition"
                                >
                                    <Check className="w-4 h-4" />
                                    Update Live Permissions
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* Target Selection View */
                        <div className="space-y-4">
                            {/* Step 1: Select Class */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    1. Select Class
                                </label>
                                <select
                                    value={selectedClass}
                                    onChange={(e) => {
                                        setSelectedClass(e.target.value);
                                        setSelectedTargets([]);
                                    }}
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                >
                                    <option value="">Choose a class...</option>
                                    {classes.map(c => (
                                        <option key={c.id} value={c.id}>
                                            {c.name || `Grade ${c.gradeLevel}-${c.section}`}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Step 2: Target Type */}
                            {selectedClass && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        2. Share With
                                    </label>
                                    <div className="grid grid-cols-3 gap-2">
                                        <button
                                            onClick={() => { setTargetType('class'); setSelectedTargets([selectedClass]); }}
                                            className={`p-3 rounded-xl border-2 transition text-center ${targetType === 'class'
                                                ? 'border-amber-500 bg-amber-50'
                                                : 'border-slate-200 hover:border-slate-300'
                                                }`}
                                        >
                                            <Users className={`w-6 h-6 mx-auto mb-1 ${targetType === 'class' ? 'text-amber-500' : 'text-slate-400'}`} />
                                            <p className="text-sm font-medium text-slate-900">Entire Class</p>
                                            <p className="text-xs text-slate-500">{students.length} students</p>
                                        </button>
                                        <button
                                            onClick={() => { setTargetType('group'); setSelectedTargets([]); }}
                                            className={`p-3 rounded-xl border-2 transition text-center ${targetType === 'group'
                                                ? 'border-amber-500 bg-amber-50'
                                                : 'border-slate-200 hover:border-slate-300'
                                                }`}
                                            disabled={groups.length === 0}
                                        >
                                            <UsersRound className={`w-6 h-6 mx-auto mb-1 ${targetType === 'group' ? 'text-amber-500' : 'text-slate-400'}`} />
                                            <p className="text-sm font-medium text-slate-900">Groups</p>
                                            <p className="text-xs text-slate-500">{groups.length} groups</p>
                                        </button>
                                        <button
                                            onClick={() => { setTargetType('student'); setSelectedTargets([]); }}
                                            className={`p-3 rounded-xl border-2 transition text-center ${targetType === 'student'
                                                ? 'border-amber-500 bg-amber-50'
                                                : 'border-slate-200 hover:border-slate-300'
                                                }`}
                                        >
                                            <User className={`w-6 h-6 mx-auto mb-1 ${targetType === 'student' ? 'text-amber-500' : 'text-slate-400'}`} />
                                            <p className="text-sm font-medium text-slate-900">Students</p>
                                            <p className="text-xs text-slate-500">Select specific</p>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Step 3: Select Targets */}
                            {selectedClass && targetType === 'group' && groups.length > 0 && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        3. Select Group(s)
                                    </label>
                                    <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                                        {groups.map(group => (
                                            <button
                                                key={group.id}
                                                onClick={() => handleTargetSelect(group.id)}
                                                className={`p-3 rounded-lg border transition text-left ${selectedTargets.includes(group.id)
                                                    ? 'border-amber-500 bg-amber-50'
                                                    : 'border-slate-200 hover:border-slate-300'
                                                    }`}
                                            >
                                                <p className="font-medium text-slate-900">{group.name}</p>
                                                <p className="text-xs text-slate-500">{group._count?.students || group.members?.length || 0} students</p>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {selectedClass && targetType === 'student' && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        3. Select Student(s)
                                    </label>
                                    <div className="relative mb-2">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="Search by name or ID..."
                                            value={studentSearch}
                                            onChange={(e) => setStudentSearch(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                                        {filteredStudents.map(student => (
                                            <button
                                                key={student.id}
                                                onClick={() => handleTargetSelect(student.id)}
                                                className={`p-2 rounded-lg border transition text-left ${selectedTargets.includes(student.id)
                                                    ? 'border-amber-500 bg-amber-50'
                                                    : 'border-slate-200 hover:border-slate-300'
                                                    }`}
                                            >
                                                <p className="font-medium text-slate-900 text-sm">
                                                    {student.firstName} {student.lastName}
                                                </p>
                                                <p className="text-xs text-slate-500">{student.studentId}</p>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Selection Summary */}
                            {selectedTargets.length > 0 && (
                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                                    <p className="text-sm text-amber-800">
                                        <span className="font-medium">Ready to share with: </span>
                                        {targetType === 'class' && classes.find(c => c.id === selectedTargets[0])?.name}
                                        {targetType === 'group' && `${selectedTargets.length} group(s)`}
                                        {targetType === 'student' && `${selectedTargets.length} student(s)`}
                                    </p>
                                </div>
                            )}

                            {/* Scheduling and Permissions */}
                            {selectedTargets.length > 0 && (
                                <div className="space-y-4 pt-4 border-t border-slate-200">
                                    <div>
                                        <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700">
                                            <input 
                                                type="checkbox" 
                                                checked={isScheduled} 
                                                onChange={e => setIsScheduled(e.target.checked)}
                                                className="rounded text-amber-500 focus:ring-amber-500"
                                            />
                                            Schedule for later
                                        </label>
                                        
                                        {isScheduled && (
                                            <div className="grid grid-cols-2 gap-4 mt-3">
                                                <div>
                                                    <label className="block text-xs text-slate-500 mb-1">Date & Time</label>
                                                    <input 
                                                        type="datetime-local" 
                                                        value={scheduledAt}
                                                        onChange={e => setScheduledAt(e.target.value)}
                                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-amber-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-slate-500 mb-1">Duration (minutes)</label>
                                                    <input 
                                                        type="number" 
                                                        min="15"
                                                        value={durationMinutes}
                                                        onChange={e => setDurationMinutes(e.target.value)}
                                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-amber-500"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-slate-800 mb-2">
                                            Default Permissions for Viewers
                                        </label>
                                        {renderPermissionsControls()}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {!isSharing && (
                    <div className="p-4 border-t border-slate-200 flex justify-end gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleStartSharing}
                            disabled={selectedTargets.length === 0}
                            className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            <Share2 className="w-4 h-4" />
                            Start Sharing
                        </button>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
}
