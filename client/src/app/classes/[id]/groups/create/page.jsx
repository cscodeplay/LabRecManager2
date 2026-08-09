'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { UsersRound, ArrowLeft, Check, Search, Save, X, Star } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { classesAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import PageHeader from '@/components/PageHeader';

export default function CreateGroupPage() {
    const router = useRouter();
    const params = useParams();
    const { user, isAuthenticated, _hasHydrated } = useAuthStore();
    const [classData, setClassData] = useState(null);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Form state
    const [groupName, setGroupName] = useState('');
    const [groupNameHindi, setGroupNameHindi] = useState('');
    const [description, setDescription] = useState('');
    const [selectedStudents, setSelectedStudents] = useState([]);
    const [leaderId, setLeaderId] = useState('');

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
        loadData();
    }, [isAuthenticated, _hasHydrated, params.id]);

    const loadData = async () => {
        try {
            const [classRes, studentsRes, groupsRes] = await Promise.all([
                classesAPI.getById(params.id),
                classesAPI.getStudents(params.id),
                classesAPI.getGroups(params.id)
            ]);
            setClassData(classRes.data.data.class);

            // Get IDs of students already in groups
            const groups = groupsRes.data.data.groups || [];
            const groupedStudentIds = new Set();
            groups.forEach(group => {
                (group.members || []).forEach(member => {
                    groupedStudentIds.add(member.student?.id || member.studentId);
                });
            });

            // Filter out students already in groups
            const allStudents = studentsRes.data.data.students || [];
            const ungroupedStudents = allStudents.filter(s => !groupedStudentIds.has(s.id));
            setStudents(ungroupedStudents);
        } catch (error) {
            toast.error('Failed to load class data');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const filteredStudents = students.filter(s =>
        s.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.studentId?.includes(searchQuery) ||
        s.admissionNumber?.includes(searchQuery)
    );

    const toggleStudent = (studentId) => {
        setSelectedStudents(prev => {
            if (prev.includes(studentId)) {
                // Remove student and also clear leader if this was the leader
                if (leaderId === studentId) {
                    setLeaderId('');
                }
                return prev.filter(id => id !== studentId);
            }
            return [...prev, studentId];
        });
    };

    const selectAll = () => {
        setSelectedStudents(filteredStudents.map(s => s.id));
    };

    const clearAll = () => {
        setSelectedStudents([]);
        setLeaderId('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!groupName.trim()) {
            toast.error('Please enter a group name');
            return;
        }

        if (selectedStudents.length === 0) {
            toast.error('Please select at least one student');
            return;
        }

        setSaving(true);
        try {
            await classesAPI.createGroup(params.id, {
                name: groupName,
                nameHindi: groupNameHindi || undefined,
                description: description || undefined,
                studentIds: selectedStudents,
                leaderId: leaderId || undefined
            });

            toast.success('Group created successfully!');
            router.push(`/classes/${params.id}`);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to create group');
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

    return (
        <div className="min-h-screen bg-slate-50">
            <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href={`/classes/${params.id}`} className="p-2 -ml-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition" title="Back to Class">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <h1 className="text-xl font-semibold text-slate-900">Create Student Group</h1>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 py-6">
                {/* Class Info */}
                <div className="card p-5 mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                            {classData?.gradeLevel}{classData?.section}
                        </div>
                        <div>
                            <h2 className="font-semibold text-slate-900">{classData?.name}</h2>
                            <p className="text-sm text-slate-600">{classData?.stream || 'General'} • {students.length} students</p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Group Details */}
                    <div className="card p-6">
                        <h3 className="text-lg font-semibold text-slate-900 mb-4">Group Details</h3>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="label">Group Name (English) *</label>
                                <input
                                    type="text"
                                    value={groupName}
                                    onChange={(e) => setGroupName(e.target.value)}
                                    className="input"
                                    placeholder="e.g., Team Alpha"
                                    required
                                />
                            </div>
                            <div>
                                <label className="label">Group Name (Hindi)</label>
                                <input
                                    type="text"
                                    value={groupNameHindi}
                                    onChange={(e) => setGroupNameHindi(e.target.value)}
                                    className="input"
                                    placeholder="e.g., टीम अल्फा"
                                />
                            </div>
                        </div>
                        <div className="mt-4">
                            <label className="label">Description (Optional)</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="input min-h-[80px]"
                                placeholder="Brief description of the group..."
                            />
                        </div>
                    </div>

                    {/* Select Students */}
                    <div className="card p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-slate-900">
                                Select Students ({selectedStudents.length} selected)
                            </h3>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={selectAll}
                                    className="text-sm text-primary-600 hover:underline"
                                >
                                    Select All
                                </button>
                                <span className="text-slate-300">|</span>
                                <button
                                    type="button"
                                    onClick={clearAll}
                                    className="text-sm text-slate-500 hover:underline"
                                >
                                    Clear All
                                </button>
                            </div>
                        </div>

                        {/* Search */}
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

                        {/* Students Grid */}
                        <div className="grid md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-2">
                            {filteredStudents.map((student) => {
                                const isSelected = selectedStudents.includes(student.id);
                                return (
                                    <div
                                        key={student.id}
                                        onClick={() => toggleStudent(student.id)}
                                        className={`p-4 rounded-xl border-2 cursor-pointer transition ${isSelected
                                            ? 'border-primary-500 bg-primary-50'
                                            : 'border-slate-200 hover:border-slate-300 bg-white'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-medium shrink-0 ${isSelected
                                                ? 'bg-primary-500 text-white'
                                                : 'bg-slate-200 text-slate-600'
                                                }`}>
                                                {isSelected ? <Check className="w-5 h-5" /> : student.firstName?.[0]}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-slate-900 truncate">
                                                    {student.firstName} {student.lastName}
                                                </p>
                                                <p className="text-sm text-slate-500">{student.studentId || student.admissionNumber}</p>
                                            </div>
                                            {isSelected && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setLeaderId(leaderId === student.id ? '' : student.id);
                                                    }}
                                                    title={leaderId === student.id ? 'Group Leader' : 'Set as Leader'}
                                                    className={`p-2 rounded-lg transition-colors ${leaderId === student.id
                                                        ? 'bg-amber-100 text-amber-600'
                                                        : 'bg-white text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                                                        }`}
                                                >
                                                    <Star className={`w-5 h-5 ${leaderId === student.id ? 'fill-amber-600' : ''}`} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {filteredStudents.length === 0 && (
                            <div className="text-center py-8 text-slate-500">
                                No students found matching your search.
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4">
                        <Link href={`/classes/${params.id}`} className="p-3 text-slate-500 hover:bg-slate-200 bg-slate-100 rounded-xl transition" title="Cancel">
                            <X className="w-5 h-5" />
                        </Link>
                        <button
                            type="submit"
                            disabled={saving || selectedStudents.length === 0}
                            className="p-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl transition shadow-sm disabled:opacity-50 disabled:hover:bg-primary-600"
                            title="Save Group"
                        >
                            {saving ? (
                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                            ) : (
                                <Save className="w-5 h-5" />
                            )}
                        </button>
                    </div>
                </form>
            </main>
        </div>
    );
}
