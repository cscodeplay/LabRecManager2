'use client';

import { useEffect, useState, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Send, Users, UsersRound, User, Search, Check, ArrowLeft, BookOpen, Calendar, Target, ChevronDown, X } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { assignmentsAPI, classesAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import PageHeader from '@/components/PageHeader';

function AssignWorkContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const preselectedClassId = searchParams.get('classId');
    const assignmentSearchRef = useRef(null);

    const { user, isAuthenticated, _hasHydrated, selectedSessionId } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Data
    const [assignments, setAssignments] = useState([]);
    const [classes, setClasses] = useState([]);
    const [students, setStudents] = useState([]);
    const [groups, setGroups] = useState([]);

    // Form state
    const [selectedAssignment, setSelectedAssignment] = useState('');
    const [selectedClass, setSelectedClass] = useState(preselectedClassId || '');
    const [targetType, setTargetType] = useState('class'); // 'class', 'group', 'student'
    const [selectedTargets, setSelectedTargets] = useState([]); // IDs of groups or students
    const [specialInstructions, setSpecialInstructions] = useState('');
    const [extendedDueDate, setExtendedDueDate] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    // Assignment search state
    const [assignmentSearchQuery, setAssignmentSearchQuery] = useState('');
    const [showAssignmentDropdown, setShowAssignmentDropdown] = useState(false);

    useEffect(() => {
        if (!_hasHydrated) return;
        if (!isAuthenticated) {
            router.push('/login');
            return;
        }
        const allowedRoles = ['admin', 'principal', 'instructor', 'lab_assistant'];
        if (!allowedRoles.includes(user?.role)) {
            router.push('/dashboard');
            return;
        }
        loadInitialData();
    }, [isAuthenticated, _hasHydrated, selectedSessionId]);

    useEffect(() => {
        if (selectedClass) {
            loadClassDetails();
        } else {
            setStudents([]);
            setGroups([]);
        }
        // Reset targets when class changes
        setSelectedTargets([]);
    }, [selectedClass]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (assignmentSearchRef.current && !assignmentSearchRef.current.contains(e.target)) {
                setShowAssignmentDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const loadInitialData = async () => {
        try {
            const [assignmentsRes, classesRes] = await Promise.all([
                assignmentsAPI.getAll({ status: 'published' }),
                classesAPI.getAll()
            ]);
            const allAssignments = assignmentsRes.data?.data?.assignments || assignmentsRes.data?.assignments || (Array.isArray(assignmentsRes.data) ? assignmentsRes.data : []);
            const publishedAssignments = allAssignments.filter(a => a.status === 'published');
            setAssignments(publishedAssignments);
            
            const allClasses = classesRes.data?.data?.classes || classesRes.data?.classes || (Array.isArray(classesRes.data) ? classesRes.data : []);
            setClasses(allClasses);
        } catch (error) {
            console.error('Failed to load data:', error);
            const msg = error.response?.data?.message || error.message || 'Failed to load assigned work';
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    const loadClassDetails = async () => {
        try {
            const [studentsRes, groupsRes] = await Promise.all([
                classesAPI.getStudents(selectedClass),
                classesAPI.getGroups(selectedClass)
            ]);
            setStudents(studentsRes.data?.data?.students || studentsRes.data?.students || (Array.isArray(studentsRes.data) ? studentsRes.data : []));
            setGroups(groupsRes.data?.data?.groups || groupsRes.data?.groups || (Array.isArray(groupsRes.data) ? groupsRes.data : []));
        } catch (error) {
            console.error('Failed to load class details:', error);
        }
    };

    // Filter assignments based on search query
    const filteredAssignments = assignments.filter(a => {
        if (!assignmentSearchQuery.trim()) return true; // Show all when empty or just spaces
        const query = assignmentSearchQuery.toLowerCase().trim();
        const title = (a.title || '').toLowerCase();
        const expNum = (a.experimentNumber || '').toLowerCase();
        const subject = (a.subject?.name || '').toLowerCase();
        return title.includes(query) || expNum.includes(query) || subject.includes(query);
    });

    const handleAssignmentSearchKeyDown = (e) => {
        // Show dropdown on space key when input is empty or has only spaces
        if (e.key === ' ' && !assignmentSearchQuery.trim()) {
            e.preventDefault();
            setShowAssignmentDropdown(true);
        }
    };

    const selectAssignment = (assignment) => {
        setSelectedAssignment(assignment.id);
        setAssignmentSearchQuery(assignment.experimentNumber ? `${assignment.experimentNumber}: ${assignment.title}` : assignment.title);
        setShowAssignmentDropdown(false);
    };

    const clearAssignmentSelection = () => {
        setSelectedAssignment('');
        setAssignmentSearchQuery('');
        setShowAssignmentDropdown(false);
    };

    const toggleTarget = (id) => {
        setSelectedTargets(prev => {
            if (prev.includes(id)) {
                return prev.filter(t => t !== id);
            }
            return [...prev, id];
        });
    };

    const selectAllTargets = () => {
        if (targetType === 'student') {
            setSelectedTargets(filteredStudents.map(s => s.id));
        } else if (targetType === 'group') {
            setSelectedTargets(groups.map(g => g.id));
        }
    };

    const clearAllTargets = () => {
        setSelectedTargets([]);
    };

    const filteredStudents = students.filter(s =>
        s.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.studentId?.includes(searchQuery) ||
        s.admissionNumber?.includes(searchQuery)
    );

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!selectedAssignment) {
            toast.error('Please select an assignment');
            return;
        }

        if (!selectedClass) {
            toast.error('Please select a class');
            return;
        }

        if (targetType !== 'class' && selectedTargets.length === 0) {
            toast.error('Please select at least one target');
            return;
        }

        if (!extendedDueDate) {
            toast.error('Please set a due date for this assignment');
            return;
        }

        setSaving(true);
        try {
            // Create targets based on targetType
            const targets = [];

            if (targetType === 'class') {
                targets.push({
                    targetType: 'class',
                    targetClassId: selectedClass,
                    targetId: selectedClass,
                    specialInstructions: specialInstructions || undefined,
                    dueDate: extendedDueDate || undefined
                });
            } else if (targetType === 'group') {
                selectedTargets.forEach(groupId => {
                    targets.push({
                        targetType: 'group',
                        targetGroupId: groupId,
                        targetId: groupId,
                        specialInstructions: specialInstructions || undefined,
                        dueDate: extendedDueDate || undefined
                    });
                });
            } else if (targetType === 'student') {
                selectedTargets.forEach(studentId => {
                    targets.push({
                        targetType: 'student',
                        targetStudentId: studentId,
                        targetId: studentId,
                        specialInstructions: specialInstructions || undefined,
                        dueDate: extendedDueDate || undefined
                    });
                });
            }

            // Send targets to API
            for (const target of targets) {
                await assignmentsAPI.addTarget(selectedAssignment, target);
            }

            toast.success(`Assignment assigned to ${targets.length} target(s) successfully!`);
            router.push('/assignments');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to assign work');
            console.error(error);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    const selectedAssignmentData = assignments.find(a => a.id === selectedAssignment);
    const selectedClassData = classes.find(c => c.id === selectedClass);

    return (
        <div className="min-h-screen bg-slate-50">
            <PageHeader title="Assign Practical Work" backLink="/assignments" />

            <main className="max-w-4xl mx-auto px-4 py-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Step 1: Select Assignment */}
                    <div className="card p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 rounded-full bg-primary-500 text-white flex items-center justify-center font-bold">1</div>
                            <h3 className="text-lg font-semibold text-slate-900">Select Assignment</h3>
                        </div>

                        {/* Searchable Assignment Dropdown */}
                        <div className="relative" ref={assignmentSearchRef}>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Type to search or press space to show all assignments..."
                                    value={assignmentSearchQuery}
                                    onChange={(e) => {
                                        setAssignmentSearchQuery(e.target.value);
                                        setShowAssignmentDropdown(true);
                                        if (!e.target.value) {
                                            setSelectedAssignment('');
                                        }
                                    }}
                                    onFocus={() => setShowAssignmentDropdown(true)}
                                    onKeyDown={handleAssignmentSearchKeyDown}
                                    className="input pl-10 pr-10"
                                />
                                {selectedAssignment ? (
                                    <button
                                        type="button"
                                        onClick={clearAssignmentSelection}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                ) : (
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                )}
                            </div>

                            {/* Dropdown List */}
                            {showAssignmentDropdown && (
                                <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                                    {filteredAssignments.length === 0 ? (
                                        <div className="p-4 text-center text-slate-500">
                                            No published assignments found
                                        </div>
                                    ) : (
                                        filteredAssignments.map(a => (
                                            <div
                                                key={a.id}
                                                onClick={() => selectAssignment(a)}
                                                className={`p-3 cursor-pointer hover:bg-primary-50 border-b border-slate-100 last:border-b-0 ${selectedAssignment === a.id ? 'bg-primary-50' : ''
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="font-medium text-slate-900">
                                                            {a.experimentNumber ? `${a.experimentNumber}: ` : ''}{a.title}
                                                        </p>
                                                        <p className="text-xs text-slate-500 mt-0.5">
                                                            {a.subject?.name || 'No Subject'} • {a.maxMarks} marks
                                                        </p>
                                                    </div>
                                                    {selectedAssignment === a.id && (
                                                        <Check className="w-5 h-5 text-primary-500" />
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>

                        {selectedAssignmentData && (
                            <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                                <div className="flex items-start gap-4">
                                    <BookOpen className="w-5 h-5 text-primary-500 mt-1" />
                                    <div>
                                        <h4 className="font-medium text-slate-900">{selectedAssignmentData.title}</h4>
                                        {selectedAssignmentData.description && (
                                            <p className="text-sm text-slate-600 mt-1 line-clamp-2">{selectedAssignmentData.description}</p>
                                        )}
                                        <div className="flex gap-4 mt-2 text-sm text-slate-500">
                                            <span className="flex items-center gap-1">
                                                <Target className="w-4 h-4" />
                                                {selectedAssignmentData.maxMarks} marks
                                            </span>
                                            <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                                Published
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Step 2: Select Class */}
                    <div className="card p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 rounded-full bg-primary-500 text-white flex items-center justify-center font-bold">2</div>
                            <h3 className="text-lg font-semibold text-slate-900">Select Class</h3>
                        </div>

                        <select
                            value={selectedClass}
                            onChange={(e) => setSelectedClass(e.target.value)}
                            className="input"
                            required
                        >
                            <option value="">Choose a class...</option>
                            {classes.map(c => (
                                <option key={c.id} value={c.id}>
                                    {c.name} {c.stream ? `(${c.stream})` : ''}
                                </option>
                            ))}
                        </select>

                        {selectedClassData && (
                            <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                                <div className="flex items-center gap-4 text-sm text-slate-600">
                                    <span className="flex items-center gap-1">
                                        <Users className="w-4 h-4" />
                                        {students.length} students
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <UsersRound className="w-4 h-4" />
                                        {groups.length} groups
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Step 3: Select Target */}
                    {selectedClass && (
                        <div className="card p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-8 h-8 rounded-full bg-primary-500 text-white flex items-center justify-center font-bold">3</div>
                                <h3 className="text-lg font-semibold text-slate-900">Assign To</h3>
                            </div>

                            {/* Target Type Selection */}
                            <div className="grid grid-cols-3 gap-4 mb-6">
                                <button
                                    type="button"
                                    onClick={() => { setTargetType('class'); setSelectedTargets([]); }}
                                    className={`p-4 rounded-lg border-2 transition text-center ${targetType === 'class'
                                        ? 'border-primary-500 bg-primary-50'
                                        : 'border-slate-200 hover:border-slate-300'
                                        }`}
                                >
                                    <Users className={`w-8 h-8 mx-auto mb-2 ${targetType === 'class' ? 'text-primary-500' : 'text-slate-400'}`} />
                                    <p className="font-medium text-slate-900">Entire Class</p>
                                    <p className="text-xs text-slate-500">{students.length} students</p>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setTargetType('group'); setSelectedTargets([]); }}
                                    className={`p-4 rounded-lg border-2 transition text-center ${targetType === 'group'
                                        ? 'border-primary-500 bg-primary-50'
                                        : 'border-slate-200 hover:border-slate-300'
                                        }`}
                                    disabled={groups.length === 0}
                                >
                                    <UsersRound className={`w-8 h-8 mx-auto mb-2 ${targetType === 'group' ? 'text-primary-500' : 'text-slate-400'}`} />
                                    <p className="font-medium text-slate-900">Groups</p>
                                    <p className="text-xs text-slate-500">{groups.length} available</p>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setTargetType('student'); setSelectedTargets([]); }}
                                    className={`p-4 rounded-lg border-2 transition text-center ${targetType === 'student'
                                        ? 'border-primary-500 bg-primary-50'
                                        : 'border-slate-200 hover:border-slate-300'
                                        }`}
                                >
                                    <User className={`w-8 h-8 mx-auto mb-2 ${targetType === 'student' ? 'text-primary-500' : 'text-slate-400'}`} />
                                    <p className="font-medium text-slate-900">Individual</p>
                                    <p className="text-xs text-slate-500">Select students</p>
                                </button>
                            </div>

                            {/* Selection for Groups */}
                            {targetType === 'group' && groups.length > 0 && (
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <p className="text-sm text-slate-600">{selectedTargets.length} groups selected</p>
                                        <div className="flex gap-2">
                                            <button type="button" onClick={selectAllTargets} className="text-sm text-primary-600 hover:underline">
                                                Select All
                                            </button>
                                            <button type="button" onClick={clearAllTargets} className="text-sm text-slate-500 hover:underline">
                                                Clear
                                            </button>
                                        </div>
                                    </div>
                                    <div className="grid md:grid-cols-2 gap-3">
                                        {groups.map(group => {
                                            const isSelected = selectedTargets.includes(group.id);
                                            return (
                                                <div
                                                    key={group.id}
                                                    className={`p-4 rounded-xl border-2 transition space-y-3 ${isSelected
                                                        ? 'border-primary-500 bg-primary-50/70 shadow-sm'
                                                        : 'border-slate-200 hover:border-slate-300 bg-white'
                                                        }`}
                                                >
                                                    <div
                                                        onClick={() => toggleTarget(group.id)}
                                                        className="flex items-center justify-between cursor-pointer"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isSelected ? 'bg-primary-500 text-white' : 'bg-slate-200 text-slate-600'
                                                                }`}>
                                                                {isSelected ? <Check className="w-5 h-5" /> : <UsersRound className="w-5 h-5" />}
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-slate-900">{group.name}</p>
                                                                {selectedClassData && (
                                                                    <p className="text-xs text-primary-700 font-medium">Class: {selectedClassData.name}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
                                                            {group.members?.length || 0} members
                                                        </span>
                                                    </div>

                                                    {/* Collapsible Group Members list */}
                                                    {group.members?.length > 0 && (
                                                        <details className="group/collapsible border border-slate-200 rounded-lg overflow-hidden bg-white text-xs">
                                                            <summary className="flex items-center justify-between p-2 bg-slate-100/80 hover:bg-slate-200/80 cursor-pointer font-medium text-slate-700 select-none">
                                                                <span className="flex items-center gap-1.5 font-semibold text-[11px]">
                                                                    <Users className="w-3.5 h-3.5 text-primary-600" />
                                                                    MEMBERS LIST ({group.members.length})
                                                                </span>
                                                                <span className="text-[10px] text-primary-600 group-open/collapsible:hidden">View members</span>
                                                                <span className="text-[10px] text-slate-500 hidden group-open/collapsible:inline">Hide members</span>
                                                            </summary>
                                                            <div className="p-2 bg-slate-50/50 space-y-1.5 border-t border-slate-200">
                                                                {group.members.filter(Boolean).map((m, mIdx) => (
                                                                    <div key={m?.id || m?.studentId || mIdx} className="flex items-center justify-between p-1.5 bg-white rounded border border-slate-100 text-xs">
                                                                        <span className="font-medium text-slate-800">
                                                                            {m?.student?.rollNumber || m?.rollNumber ? `#${m?.student?.rollNumber || m?.rollNumber} ` : ''}{m?.student?.firstName || m?.firstName || 'Student'} {m?.student?.lastName || m?.lastName || ''}
                                                                        </span>
                                                                        <span className={`px-1.5 py-0.5 text-[9px] rounded font-semibold ${(m?.student?.gender || m?.gender) === 'female' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'}`}>
                                                                            {(m?.student?.gender || m?.gender) === 'female' ? 'Female' : 'Male'}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </details>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Selection for Individual Students */}
                            {targetType === 'student' && (
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <p className="text-sm text-slate-600">{selectedTargets.length} students selected</p>
                                        <div className="flex gap-2">
                                            <button type="button" onClick={selectAllTargets} className="text-sm text-primary-600 hover:underline">
                                                Select All
                                            </button>
                                            <button type="button" onClick={clearAllTargets} className="text-sm text-slate-500 hover:underline">
                                                Clear
                                            </button>
                                        </div>
                                    </div>
                                    <div className="relative mb-4">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="Search students..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="input pl-10"
                                        />
                                    </div>
                                    <div className="grid md:grid-cols-3 gap-3 max-h-[300px] overflow-y-auto">
                                        {filteredStudents.map(student => {
                                            const isSelected = selectedTargets.includes(student.id);
                                            return (
                                                <div
                                                    key={student.id}
                                                    onClick={() => toggleTarget(student.id)}
                                                    className={`p-3 rounded-lg border-2 cursor-pointer transition ${isSelected
                                                        ? 'border-primary-500 bg-primary-50'
                                                        : 'border-slate-200 hover:border-slate-300'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${isSelected ? 'bg-primary-500 text-white' : 'bg-slate-200 text-slate-600'
                                                            }`}>
                                                            {isSelected ? <Check className="w-3 h-3" /> : student.firstName?.[0]}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="font-medium text-slate-900 text-sm truncate">
                                                                {student.firstName} {student.lastName}
                                                            </p>
                                                            <p className="text-xs text-slate-500">{student.studentId || student.admissionNumber}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {targetType === 'class' && (
                                <div className="bg-primary-50 p-4 rounded-lg text-center">
                                    <Users className="w-12 h-12 text-primary-500 mx-auto mb-2" />
                                    <p className="text-slate-700">
                                        This assignment will be assigned to <strong>all {students.length} students</strong> in the class.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Due Date Section - appears after target selection */}
                    {selectedAssignment && (
                        <div className="card p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold">
                                    <Calendar className="w-4 h-4" />
                                </div>
                                <h3 className="text-lg font-semibold text-slate-900">Set Due Date</h3>
                                <span className="text-xs text-red-500 font-medium">Required</span>
                            </div>

                            <div className="max-w-md">
                                <label className="label">
                                    Submission Deadline
                                </label>
                                <input
                                    type="datetime-local"
                                    value={extendedDueDate}
                                    onChange={(e) => setExtendedDueDate(e.target.value)}
                                    className="input"
                                    min={new Date().toISOString().slice(0, 16)}
                                    required
                                />
                                <p className="text-xs text-slate-500 mt-1">Students must submit before this date and time</p>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Additional Remarks/Instructions */}
                    {selectedAssignment && (
                        <div className="card p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-8 h-8 rounded-full bg-primary-500 text-white flex items-center justify-center font-bold">4</div>
                                <h3 className="text-lg font-semibold text-slate-900">Remarks</h3>
                                <span className="text-xs text-slate-400 font-medium">Optional</span>
                            </div>

                            <div>
                                <label className="label">
                                    Special Instructions or Notes
                                </label>
                                <textarea
                                    value={specialInstructions}
                                    onChange={(e) => setSpecialInstructions(e.target.value)}
                                    className="input min-h-[100px]"
                                    placeholder="Add any remarks, special instructions, or notes that will be visible to students..."
                                />
                                <p className="text-xs text-slate-500 mt-1">These remarks will be displayed to assigned students</p>
                            </div>
                        </div>
                    )}

                    {/* Submit */}
                    <div className="flex justify-end gap-3 pt-4">
                        <Link href="/assignments" className="p-3 text-slate-500 hover:bg-slate-200 bg-slate-100 rounded-xl transition" title="Cancel">
                            <X className="w-5 h-5" />
                        </Link>
                        <button
                            type="submit"
                            disabled={saving || !selectedAssignment || !selectedClass || (targetType !== 'class' && selectedTargets.length === 0)}
                            className="p-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl transition shadow-sm disabled:opacity-50 disabled:hover:bg-primary-600"
                            title="Assign Work"
                        >
                            {saving ? (
                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                            ) : (
                                <Send className="w-5 h-5" />
                            )}
                        </button>
                    </div>
                </form>
            </main>
        </div>
    );
}

export default function AssignWorkPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full"></div>
            </div>
        }>
            <AssignWorkContent />
        </Suspense>
    );
}
