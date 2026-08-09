'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Users, GraduationCap, ArrowLeft, UserPlus, UsersRound, Plus, Search, Mail, Phone, Calendar, Lock, ChevronLeft, ChevronRight, Shuffle, Trash2, UserMinus, X, ChevronDown, ChevronUp, Monitor, Edit2, Upload, Download } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { classesAPI, labsAPI, trainingAPI, usersAPI } from '@/lib/api';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import PageHeader from '@/components/PageHeader';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function ClassDetailPage() {
    const router = useRouter();
    const params = useParams();
    const { user, isAuthenticated, _hasHydrated, selectedSessionId } = useAuthStore();
    const [classData, setClassData] = useState(null);
    const [students, setStudents] = useState([]);
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('students');
    const [initialSessionId, setInitialSessionId] = useState(null);

    // Add Student modal state
    const [showAddStudentModal, setShowAddStudentModal] = useState(false);
    const [newStudent, setNewStudent] = useState({
        firstName: '',
        lastName: '',
        studentId: '',
        email: '',
        phone: '',
        rollNumber: ''
    });

    // Edit Student modal state
    const [editingStudent, setEditingStudent] = useState(null);
    const [editStudentData, setEditStudentData] = useState({
        firstName: '',
        lastName: '',
        studentId: '',
        email: '',
        phone: '',
        rollNumber: ''
    });

    // Delete Student modal state
    const [deletingStudent, setDeletingStudent] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    // Training analytics
    const [trainingAnalytics, setTrainingAnalytics] = useState(null);
    const [loadingTraining, setLoadingTraining] = useState(false);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [autoGrouping, setAutoGrouping] = useState(false);

    // Group management state
    const [expandedGroupId, setExpandedGroupId] = useState(null);
    const [ungroupedStudents, setUngroupedStudents] = useState([]);
    const [addingToGroup, setAddingToGroup] = useState(null);
    const [selectedStudentToAdd, setSelectedStudentToAdd] = useState('');

    // PC assignment state
    const [allPCs, setAllPCs] = useState([]);
    const [assigningPcToGroup, setAssigningPcToGroup] = useState(null);

    // Track initial session and redirect if session changes
    useEffect(() => {
        if (!_hasHydrated || !selectedSessionId) return;

        if (initialSessionId === null) {
            // First load - store the initial session
            setInitialSessionId(selectedSessionId);
        } else if (initialSessionId !== selectedSessionId) {
            // Session changed - redirect to classes list
            router.push('/classes');
        }
    }, [selectedSessionId, initialSessionId, _hasHydrated, router]);

    useEffect(() => {
        if (!_hasHydrated) return;
        if (!isAuthenticated) {
            router.push('/login');
            return;
        }
        loadClassData();
    }, [isAuthenticated, _hasHydrated, params.id]);

    const loadClassData = async () => {
        try {
            const [classRes, studentsRes, groupsRes] = await Promise.all([
                classesAPI.getById(params.id),
                classesAPI.getStudents(params.id),
                classesAPI.getGroups(params.id)
            ]);
            setClassData(classRes.data.data.class);
            setStudents(studentsRes.data.data.students || []);
            setGroups(groupsRes.data.data.groups || []);
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
        s.admissionNumber?.includes(searchQuery) ||
        s.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const isAdmin = user?.role === 'admin' || user?.role === 'principal';
    const isInstructor = user?.role === 'instructor' || user?.role === 'lab_assistant';

    // Pagination calculations
    const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedStudents = filteredStudents.slice(startIndex, startIndex + itemsPerPage);

    // Reset to page 1 when search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);

    // Auto-generate groups handler
    const handleAutoGenerateGroups = async () => {
        if (students.length < 2) {
            toast.error('Need at least 2 students to create groups');
            return;
        }

        setAutoGrouping(true);
        try {
            const res = await classesAPI.autoGenerateGroups(params.id);
            toast.success(res.data.message || 'Groups created successfully!');
            loadClassData();
            setActiveTab('groups');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to create groups');
        } finally {
            setAutoGrouping(false);
        }
    };

    // Auto-assign PCs contiguously (Boys contiguous block first, then Girls contiguous block)
    const [autoAssigningPcs, setAutoAssigningPcs] = useState(false);
    const handleAutoAssignPcs = async () => {
        if (groups.length === 0) {
            toast.error('No groups available to assign PCs');
            return;
        }

        setAutoAssigningPcs(true);
        try {
            const res = await classesAPI.autoAssignPcs(params.id);
            toast.success(res.data.message || 'PCs assigned contiguously to groups!');
            loadClassData();
            setActiveTab('groups');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to auto-assign PCs');
        } finally {
            setAutoAssigningPcs(false);
        }
    };

    const handleLoadTrainingAnalytics = async () => {
        setActiveTab('training');
        if (!trainingAnalytics) {
            setLoadingTraining(true);
            try {
                const res = await trainingAPI.getClassAnalytics(params.id);
                setTrainingAnalytics(res.data.data.analytics || []);
            } catch (error) {
                toast.error('Failed to load training analytics');
            } finally {
                setLoadingTraining(false);
            }
        }
    };

    // Delete group handler
    const handleDeleteGroup = async (groupId) => {
        if (!confirm('Are you sure you want to delete this group?')) return;
        try {
            await classesAPI.deleteGroup(params.id, groupId);
            toast.success('Group deleted');
            loadClassData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to delete group');
        }
    };

    // Remove member from group
    const handleRemoveMember = async (groupId, studentId) => {
        try {
            await classesAPI.removeGroupMember(params.id, groupId, studentId);
            toast.success('Student removed from group');
            loadClassData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to remove student');
        }
    };

    // Load ungrouped students when expanding a group for adding
    const handleShowAddMember = async (groupId) => {
        setAddingToGroup(groupId);
        try {
            const res = await classesAPI.getUngroupedStudents(params.id);
            setUngroupedStudents(res.data.data.students || []);
        } catch (error) {
            toast.error('Failed to load available students');
        }
    };

    // Add member to group
    const handleAddMember = async (groupId) => {
        if (!selectedStudentToAdd) return;
        try {
            await classesAPI.addGroupMember(params.id, groupId, selectedStudentToAdd);
            toast.success('Student added to group');
            setAddingToGroup(null);
            setSelectedStudentToAdd('');
            loadClassData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to add student');
        }
    };

    // Load all PCs when showing PC assignment dropdown (filter out already assigned ones)
    const handleShowAssignPc = async (groupId) => {
        setAssigningPcToGroup(groupId);
        try {
            const res = await labsAPI.getAllPCs();
            const allPCsData = res.data.data.pcs || [];

            // Get PCs already assigned to other groups in this class
            const assignedPcIds = groups
                .filter(g => g.id !== groupId && g.assignedPcId)
                .map(g => g.assignedPcId);

            // Filter out assigned PCs (but keep the one currently assigned to this group)
            const currentGroup = groups.find(g => g.id === groupId);
            const availablePCs = allPCsData.filter(pc =>
                !assignedPcIds.includes(pc.id) || pc.id === currentGroup?.assignedPcId
            );

            setAllPCs(availablePCs);
        } catch (error) {
            toast.error('Failed to load PCs');
        }
    };

    // Assign PC to group
    const handleAssignPc = async (groupId, pcId) => {
        try {
            await labsAPI.assignPcToGroup(groupId, pcId || null);
            toast.success(pcId ? 'PC assigned to group' : 'PC unassigned');
            setAssigningPcToGroup(null);
            loadClassData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to assign PC');
        }
    };

    // --- Student Management Handlers ---

    // Create single student and enroll in class
    const handleCreateStudent = async (e) => {
        e.preventDefault();
        if (!newStudent.firstName.trim() || !newStudent.lastName.trim()) {
            toast.error('First and Last name are required');
            return;
        }

        setSubmitting(true);
        try {
            const emailToUse = newStudent.email.trim() || `${newStudent.firstName.toLowerCase().trim()}.${newStudent.lastName.toLowerCase().trim()}@student.school.edu`;
            const res = await api.post('/users/bulk', {
                users: [{
                    firstName: newStudent.firstName.trim(),
                    lastName: newStudent.lastName.trim(),
                    studentId: newStudent.studentId.trim() || undefined,
                    admissionNumber: newStudent.studentId.trim() || undefined,
                    email: emailToUse,
                    phone: newStudent.phone.trim() || undefined,
                    rollNumber: newStudent.rollNumber ? parseInt(newStudent.rollNumber) : undefined,
                    role: 'student'
                }],
                classId: params.id
            });

            const failedList = res.data.data?.failed || [];
            if (failedList.length > 0) {
                toast.error(`Failed to add student: ${failedList[0].reason || 'Unknown error'}`);
            } else {
                toast.success('Student added successfully!');
                setShowAddStudentModal(false);
                setNewStudent({ firstName: '', lastName: '', studentId: '', email: '', phone: '', rollNumber: '' });
                loadClassData();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to add student');
        } finally {
            setSubmitting(false);
        }
    };

    // Open Edit Modal
    const handleOpenEditModal = (student) => {
        setEditingStudent(student);
        setEditStudentData({
            firstName: student.firstName || '',
            lastName: student.lastName || '',
            studentId: student.studentId || student.admissionNumber || '',
            gender: student.gender || 'male',
            email: student.email || '',
            phone: student.phone || '',
            rollNumber: student.rollNumber ? String(student.rollNumber) : ''
        });
    };

    // Save Edited Student
    const handleUpdateStudent = async (e) => {
        e.preventDefault();
        if (!editStudentData.firstName.trim() || !editStudentData.lastName.trim()) {
            toast.error('First and Last name are required');
            return;
        }

        setSubmitting(true);
        try {
            await usersAPI.update(editingStudent.id, {
                firstName: editStudentData.firstName.trim(),
                lastName: editStudentData.lastName.trim(),
                email: editStudentData.email.trim(),
                phone: editStudentData.phone.trim() || null,
                studentId: editStudentData.studentId.trim() || null,
                admissionNumber: editStudentData.studentId.trim() || null
            });

            toast.success('Student updated successfully!');
            setEditingStudent(null);
            loadClassData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update student');
        } finally {
            setSubmitting(false);
        }
    };

    // Delete Student
    const handleDeleteStudent = async () => {
        if (!deletingStudent) return;
        setSubmitting(true);
        try {
            await usersAPI.delete(deletingStudent.id);
            toast.success('Student deleted successfully!');
            setDeletingStudent(null);
            loadClassData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to delete student');
        } finally {
            setSubmitting(false);
        }
    };

    // Export CSV
    const handleExportCSV = () => {
        if (students.length === 0) {
            toast.error('No students to export');
            return;
        }

        const headers = ['Roll Number', 'First Name', 'Last Name', 'Student ID', 'Email', 'Phone'];
        const rows = students.map((s, idx) => [
            s.rollNumber || (idx + 1),
            `"${s.firstName || ''}"`,
            `"${s.lastName || ''}"`,
            `"${s.studentId || s.admissionNumber || ''}"`,
            `"${s.email || ''}"`,
            `"${s.phone || ''}"`
        ]);

        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `${classData?.name || 'Class'}_Students.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('CSV exported successfully!');
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    if (!classData) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center">
                    <h2 className="text-xl font-semibold text-slate-700">Class not found</h2>
                    <Link href="/classes" className="text-primary-600 hover:underline mt-2 inline-block">
                        ← Back to Classes
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <PageHeader title={classData.name} />

            <main className="max-w-7xl mx-auto px-4 py-6">
                {/* Class Info Card */}
                <div className="card overflow-hidden mb-6 flex flex-col">
                    <div className="p-6 flex-1">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-bold text-2xl shadow-sm">
                                {classData.gradeLevel}
                                {classData.section && <span className="text-lg ml-0.5">{classData.section}</span>}
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold text-slate-900">{classData.name}</h2>
                                {classData.nameHindi && (
                                    <p className="text-slate-600">{classData.nameHindi}</p>
                                )}
                                <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                                    <span className="px-2 py-1 bg-slate-100 rounded-full font-medium text-slate-600">
                                        {classData.stream || 'General'}
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <Users className="w-4 h-4" />
                                        {students.length} Students
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <UsersRound className="w-4 h-4" />
                                        {groups.length} Groups
                                    </span>
                                    {classData.academicYear && (
                                        <span className={`flex items-center gap-1 px-2 py-1 rounded-full font-medium ${classData.academicYear.isCurrent
                                            ? 'bg-emerald-100 text-emerald-700'
                                            : 'bg-amber-100 text-amber-700'
                                            }`}>
                                            <Calendar className="w-3 h-3" />
                                            {classData.academicYear.yearLabel}
                                            {!classData.academicYear.isCurrent && <Lock className="w-3 h-3" />}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Action Bar */}
                    <div className="px-5 py-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-end gap-1 text-slate-500">
                        {(isAdmin || isInstructor) && (
                            <>
                                <button
                                    onClick={() => setShowAddStudentModal(true)}
                                    className="p-1.5 hover:text-primary-600 hover:bg-primary-50 rounded-md transition-colors"
                                    title="Add Student"
                                >
                                    <UserPlus className="w-5 h-5" />
                                </button>
                                <Link
                                    href={`/admin/students/import?classId=${params.id}`}
                                    className="p-1.5 hover:text-primary-600 hover:bg-primary-50 rounded-md transition-colors block"
                                    title="Import Students CSV"
                                >
                                    <Upload className="w-5 h-5" />
                                </Link>
                                <button
                                    onClick={handleExportCSV}
                                    className="p-1.5 hover:text-primary-600 hover:bg-primary-50 rounded-md transition-colors"
                                    title="Export Students CSV"
                                >
                                    <Download className="w-5 h-5" />
                                </button>
                                <div className="w-px h-4 bg-slate-200 mx-1"></div>
                                <Link
                                    href={`/classes/${params.id}/groups/create`}
                                    className="p-1.5 hover:text-primary-600 hover:bg-primary-50 rounded-md transition-colors block"
                                    title="Create Group"
                                >
                                    <UsersRound className="w-5 h-5" />
                                </Link>
                                <button
                                    onClick={handleAutoGenerateGroups}
                                    disabled={autoGrouping || students.length < 2}
                                    className={`p-1.5 rounded-md transition-colors ${
                                        autoGrouping
                                            ? 'text-primary-500 bg-primary-50 animate-pulse'
                                            : 'hover:text-primary-600 hover:bg-primary-50'
                                    }`}
                                    title="Auto Generate Groups"
                                >
                                    <Shuffle className={`w-5 h-5 ${autoGrouping ? 'animate-spin' : ''}`} />
                                </button>
                                <button
                                    onClick={handleAutoAssignPcs}
                                    disabled={autoAssigningPcs || groups.length === 0}
                                    className={`p-1.5 rounded-md transition-colors ${
                                        autoAssigningPcs
                                            ? 'text-primary-500 bg-primary-50 animate-pulse'
                                            : 'hover:text-primary-600 hover:bg-primary-50'
                                    }`}
                                    title="Auto Assign PCs"
                                >
                                    <Monitor className={`w-5 h-5 ${autoAssigningPcs ? 'animate-bounce' : ''}`} />
                                </button>
                                <div className="w-px h-4 bg-slate-200 mx-1"></div>
                                <Link
                                    href={`/assignments/assign?classId=${params.id}`}
                                    className="p-1.5 text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-md transition-colors block"
                                    title="Assign Work"
                                >
                                    <Plus className="w-5 h-5" />
                                </Link>
                            </>
                        )}
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-4 mb-6">
                    <button
                        onClick={() => setActiveTab('students')}
                        className={`px-4 py-2 rounded-lg font-medium transition ${activeTab === 'students'
                            ? 'bg-primary-500 text-white'
                            : 'bg-white text-slate-600 hover:bg-slate-100'
                            }`}
                    >
                        <Users className="w-4 h-4 inline mr-2" />
                        Students ({students.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('groups')}
                        className={`px-4 py-2 rounded-lg font-medium transition ${activeTab === 'groups'
                            ? 'bg-primary-500 text-white'
                            : 'bg-white text-slate-600 hover:bg-slate-100'
                            }`}
                    >
                        <UsersRound className="w-4 h-4 inline mr-2" />
                        Groups ({groups.length})
                    </button>
                    {(isAdmin || isInstructor) && (
                        <button
                            onClick={handleLoadTrainingAnalytics}
                            className={`px-4 py-2 rounded-lg font-medium transition ${activeTab === 'training'
                                ? 'bg-primary-500 text-white'
                                : 'bg-white text-slate-600 hover:bg-slate-100'
                                }`}
                        >
                            <GraduationCap className="w-4 h-4 inline mr-2" />
                            Training Analytics
                        </button>
                    )}
                </div>

                {/* Students Tab */}
                {activeTab === 'students' && (
                    <>
                        {/* Search */}
                        <div className="card p-4 mb-6">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search by name, student ID, or email..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="input pl-10"
                                />
                            </div>
                        </div>

                        {/* Students List */}
                        {filteredStudents.length === 0 ? (
                            <div className="card p-12 text-center">
                                <Users className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                                <h3 className="text-lg font-medium text-slate-700 mb-2">No students found</h3>
                                <p className="text-slate-500">
                                    {searchQuery ? 'Try a different search term.' : 'No students enrolled in this class yet.'}
                                </p>
                            </div>
                        ) : (
                            <div className="card overflow-hidden">
                                <table className="w-full">
                                    <thead className="bg-slate-50 border-b border-slate-100">
                                        <tr>
                                            <th className="text-left px-6 py-3 text-sm font-medium text-slate-600">Roll</th>
                                            <th className="text-left px-6 py-3 text-sm font-medium text-slate-600">Student</th>
                                            <th className="text-left px-6 py-3 text-sm font-medium text-slate-600">Gender</th>
                                            <th className="text-left px-6 py-3 text-sm font-medium text-slate-600">Student ID</th>
                                            <th className="text-left px-6 py-3 text-sm font-medium text-slate-600">Email</th>
                                            <th className="text-left px-6 py-3 text-sm font-medium text-slate-600">Contact</th>
                                            {(isAdmin || isInstructor) && (
                                                <th className="text-right px-6 py-3 text-sm font-medium text-slate-600">Actions</th>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {paginatedStudents.map((student, index) => (
                                            <tr key={student.id} className="hover:bg-slate-50 transition">
                                                <td className="px-6 py-4 font-medium text-slate-900">
                                                    {student.rollNumber || startIndex + index + 1}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-medium">
                                                            {student.firstName?.[0]}{student.lastName?.[0]}
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-slate-900">
                                                                {student.firstName} {student.lastName}
                                                            </p>
                                                            {student.firstNameHindi && (
                                                                <p className="text-sm text-slate-500">
                                                                    {student.firstNameHindi} {student.lastNameHindi}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2.5 py-1 text-xs rounded-full font-semibold border ${
                                                        student.gender === 'female'
                                                            ? 'bg-pink-50 text-pink-700 border-pink-200'
                                                            : 'bg-blue-50 text-blue-700 border-blue-200'
                                                    }`}>
                                                        {student.gender === 'female' ? 'Female' : 'Male'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded font-mono text-sm">
                                                        {student.studentId || student.admissionNumber || '-'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-slate-600">
                                                    <a href={`mailto:${student.email}`} className="flex items-center gap-1 hover:text-primary-600">
                                                        <Mail className="w-4 h-4" />
                                                        {student.email}
                                                    </a>
                                                </td>
                                                <td className="px-6 py-4 text-slate-600">
                                                    {student.phone ? (
                                                        <a href={`tel:${student.phone}`} className="flex items-center gap-1 hover:text-primary-600">
                                                            <Phone className="w-4 h-4" />
                                                            {student.phone}
                                                        </a>
                                                    ) : '-'}
                                                </td>
                                                {(isAdmin || isInstructor) && (
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button
                                                                onClick={() => handleOpenEditModal(student)}
                                                                className="p-1.5 text-slate-500 hover:text-primary-600 hover:bg-slate-100 rounded-lg transition"
                                                                title="Edit Student"
                                                            >
                                                                <Edit2 className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => setDeletingStudent(student)}
                                                                className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                                                title="Delete Student"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                {/* Pagination Controls */}
                                {totalPages > 1 && (
                                    <div className="flex items-center justify-between p-4 border-t border-slate-200">
                                        <div className="flex items-center gap-2 text-sm text-slate-600">
                                            <span>Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredStudents.length)} of {filteredStudents.length}</span>
                                            <select
                                                value={itemsPerPage}
                                                onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                                                className="input py-1 px-2 text-sm w-20"
                                            >
                                                <option value={5}>5</option>
                                                <option value={10}>10</option>
                                                <option value={20}>20</option>
                                                <option value={50}>50</option>
                                            </select>
                                            <span>per page</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => setCurrentPage(1)}
                                                disabled={currentPage === 1}
                                                className="px-2 py-1 rounded hover:bg-slate-100 disabled:opacity-50"
                                            >
                                                First
                                            </button>
                                            <button
                                                onClick={() => setCurrentPage(p => p - 1)}
                                                disabled={currentPage === 1}
                                                className="p-1 rounded hover:bg-slate-100 disabled:opacity-50"
                                            >
                                                <ChevronLeft className="w-5 h-5" />
                                            </button>
                                            <span className="px-3 py-1 bg-primary-50 text-primary-700 rounded font-medium">
                                                {currentPage} / {totalPages}
                                            </span>
                                            <button
                                                onClick={() => setCurrentPage(p => p + 1)}
                                                disabled={currentPage === totalPages}
                                                className="p-1 rounded hover:bg-slate-100 disabled:opacity-50"
                                            >
                                                <ChevronRight className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => setCurrentPage(totalPages)}
                                                disabled={currentPage === totalPages}
                                                className="px-2 py-1 rounded hover:bg-slate-100 disabled:opacity-50"
                                            >
                                                Last
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}

                {/* Groups Tab */}
                {activeTab === 'groups' && (
                    <>
                        {groups.length === 0 ? (
                            <div className="card p-12 text-center">
                                <UsersRound className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                                <h3 className="text-lg font-medium text-slate-700 mb-2">No groups created</h3>
                                <p className="text-slate-500 mb-4">
                                    Create groups to organize students for assignments and projects.
                                </p>
                                {(isAdmin || isInstructor) && (
                                    <Link
                                        href={`/classes/${params.id}/groups/create`}
                                        className="btn btn-primary"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Create First Group
                                    </Link>
                                )}
                            </div>
                        ) : (
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {groups.map((group) => (
                                    <div key={group.id} className="card hover:shadow-md transition-shadow group-hover flex flex-col overflow-hidden">
                                        <div className={`p-5 flex-1 ${
                                            group.assignedPc
                                                ? 'bg-emerald-50/20'
                                                : 'bg-red-50/20'
                                        }`}>
                                            <div className="flex items-start justify-between mb-4">
                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white ${
                                                    group.assignedPc
                                                        ? 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-sm'
                                                        : 'bg-gradient-to-br from-rose-500 to-red-600 shadow-sm'
                                                }`}>
                                                    <UsersRound className="w-6 h-6" />
                                                </div>
                                                <span className="text-sm font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                                                    {group.members?.length || 0} members
                                                </span>
                                            </div>

                                            <h3 className="text-lg font-bold text-slate-900 mb-3">{group.name}</h3>

                                            {/* Assigned PC Display/Assignment */}
                                            <div className={`mb-3 p-2.5 rounded-lg border ${
                                                group.assignedPc
                                                    ? 'bg-emerald-50/50 border-emerald-200 text-emerald-900'
                                                    : 'bg-red-50/50 border-red-200 text-red-900'
                                            }`}>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <Monitor className={`w-4 h-4 ${group.assignedPc ? 'text-emerald-600' : 'text-red-500'}`} />
                                                        {group.assignedPc ? (
                                                            <span className="text-sm font-semibold text-emerald-800">
                                                                {group.assignedPc.itemNumber}
                                                                <span className="text-xs text-emerald-600 ml-1">({group.assignedPc.lab?.name})</span>
                                                            </span>
                                                        ) : (
                                                            <span className="text-sm font-medium text-red-600">No PC</span>
                                                        )}
                                                    </div>
                                                    {(isAdmin || isInstructor) && (
                                                        assigningPcToGroup === group.id ? (
                                                            <div className="flex items-center gap-1">
                                                                <select
                                                                    onChange={(e) => handleAssignPc(group.id, e.target.value)}
                                                                    className="text-xs py-1 px-2 border rounded bg-white"
                                                                    defaultValue=""
                                                                >
                                                                    <option value="">Select PC...</option>
                                                                    <option value="">-- Unassign --</option>
                                                                    {allPCs
                                                                        .filter(pc => {
                                                                            // Get all PC IDs assigned to other groups in this class
                                                                            const assignedPcIds = classData.groups
                                                                                ?.filter(g => g.id !== group.id && g.assignedPc)
                                                                                .map(g => g.assignedPc.id) || [];
                                                                            // Allow this PC if it's not assigned to another group, or if it's the current group's PC
                                                                            return !assignedPcIds.includes(pc.id) || group.assignedPc?.id === pc.id;
                                                                        })
                                                                        .map(pc => (
                                                                            <option key={pc.id} value={pc.id}>
                                                                                {pc.itemNumber} ({pc.lab?.name})
                                                                            </option>
                                                                        ))}
                                                                </select>
                                                                <button onClick={() => setAssigningPcToGroup(null)} className="text-slate-400 hover:text-slate-600 bg-white p-1 rounded border">
                                                                    <X className="w-3 h-3" />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                onClick={() => handleShowAssignPc(group.id)}
                                                                className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                                                            >
                                                                {group.assignedPc ? 'Change' : 'Assign PC'}
                                                            </button>
                                                        )
                                                    )}
                                                </div>
                                            </div>

                                            {/* Collapsed view - member chips */}
                                            {expandedGroupId !== group.id && (
                                                <div className="flex flex-wrap gap-2">
                                                    {group.members?.slice(0, 4).map((member) => (
                                                        <span key={member.student.id} className="px-2 py-1 bg-white border border-slate-200 shadow-sm text-slate-700 text-xs rounded-full">
                                                            {member.student.firstName} {member.student.lastName?.[0]}.
                                                        </span>
                                                    ))}
                                                    {group.members?.length > 4 && (
                                                        <span className="px-2 py-1 bg-slate-100 text-slate-500 text-xs rounded-full">
                                                            +{group.members.length - 4}
                                                        </span>
                                                    )}
                                                </div>
                                            )}

                                            {/* Expanded view - member list with remove buttons */}
                                            {expandedGroupId === group.id && (
                                                <div className="space-y-2">
                                                    {group.members?.map((member) => (
                                                        <div key={member.student.id} className="flex items-center justify-between py-1.5 px-3 bg-white border border-slate-100 shadow-sm rounded-lg">
                                                            <span className="text-sm font-medium text-slate-700">
                                                                {member.student.firstName} {member.student.lastName}
                                                                {member.role === 'leader' && <span className="ml-1 text-xs bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded">★ Leader</span>}
                                                            </span>
                                                            <div className="flex items-center gap-1">
                                                                {(isAdmin || isInstructor) && member.role !== 'leader' && (
                                                                    <button
                                                                        onClick={async () => {
                                                                            try {
                                                                                await classesAPI.setGroupLeader(params.id, group.id, member.student.id);
                                                                                toast.success(`${member.student.firstName} is now the leader`);
                                                                                loadClassData();
                                                                            } catch (error) {
                                                                                toast.error(error.response?.data?.message || 'Failed to set leader');
                                                                            }
                                                                        }}
                                                                        className="px-2 py-0.5 text-xs text-amber-600 hover:bg-amber-50 rounded font-medium"
                                                                        title="Make Leader"
                                                                    >
                                                                        Make Leader
                                                                    </button>
                                                                )}
                                                                {(isAdmin || isInstructor) && (
                                                                    <button
                                                                        onClick={() => handleRemoveMember(group.id, member.student.id)}
                                                                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                                                        title="Remove from group"
                                                                    >
                                                                        <UserMinus className="w-4 h-4" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}

                                                    {/* Add member section */}
                                                    {(isAdmin || isInstructor) && (
                                                        <div className="mt-3 pt-3 border-t border-slate-200">
                                                            {addingToGroup === group.id ? (
                                                                <div className="flex gap-2">
                                                                    <select
                                                                        value={selectedStudentToAdd}
                                                                        onChange={(e) => setSelectedStudentToAdd(e.target.value)}
                                                                        className="input text-sm flex-1"
                                                                    >
                                                                        <option value="">Select student...</option>
                                                                        {ungroupedStudents.map(s => (
                                                                            <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>
                                                                        ))}
                                                                    </select>
                                                                    <button
                                                                        onClick={() => handleAddMember(group.id)}
                                                                        className="btn btn-primary text-xs py-1 px-2"
                                                                        disabled={!selectedStudentToAdd}
                                                                    >
                                                                        Add
                                                                    </button>
                                                                    <button
                                                                        onClick={() => { setAddingToGroup(null); setSelectedStudentToAdd(''); }}
                                                                        className="p-1 text-slate-400 hover:text-slate-600"
                                                                    >
                                                                        <X className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    onClick={() => handleShowAddMember(group.id)}
                                                                    className="text-sm font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1"
                                                                >
                                                                    <UserPlus className="w-4 h-4" /> Add Student
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div className="px-5 py-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-end gap-1 text-slate-500">
                                            <button
                                                onClick={() => setExpandedGroupId(expandedGroupId === group.id ? null : group.id)}
                                                className="p-1.5 hover:text-primary-600 hover:bg-primary-50 rounded-md transition-colors"
                                                title={expandedGroupId === group.id ? "Collapse members" : "Expand members"}
                                            >
                                                {expandedGroupId === group.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                            </button>
                                            {(isAdmin || isInstructor) && (
                                                <button
                                                    onClick={() => handleDeleteGroup(group.id)}
                                                    className="p-1.5 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                                    title="Delete group"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}

                {/* Training Analytics Tab */}
                {activeTab === 'training' && (isAdmin || isInstructor) && (
                    <div className="card p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-slate-900 border-b border-primary-100 pb-2 border-b-2 inline-block">
                                Training Progress & Leaderboard
                            </h3>
                        </div>

                        {loadingTraining ? (
                            <div className="flex justify-center p-12">
                                <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full"></div>
                            </div>
                        ) : !trainingAnalytics || trainingAnalytics.length === 0 ? (
                            <div className="text-center p-12 bg-slate-50 rounded-xl border border-slate-100 pb-16">
                                <GraduationCap className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                                <h3 className="text-lg font-medium text-slate-700">No Training Data</h3>
                                <p className="text-slate-500">Students have not started any training modules yet.</p>
                            </div>
                        ) : (
                            <div className="space-y-8">
                                {/* Group Charts */}
                                {groups && groups.length > 0 && (
                                    <div className="bg-white rounded-xl border border-slate-200 p-6">
                                        <h4 className="text-lg font-semibold text-slate-800 mb-6">Group Analytics (Average XP)</h4>
                                        <div className="h-64">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={
                                                    groups.map(g => {
                                                        const memberIds = g.members?.map(m => m.student.id) || [];
                                                        const memberAnalytics = trainingAnalytics.filter(a => memberIds.includes(a.student.id));
                                                        const totalGroupXP = memberAnalytics.reduce((sum, a) => sum + (a.totalXP || 0), 0);
                                                        const avgXP = memberAnalytics.length > 0 ? totalGroupXP / memberAnalytics.length : 0;
                                                        return {
                                                            name: g.name,
                                                            avgXP: Math.round(avgXP)
                                                        };
                                                    })
                                                }>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                    <XAxis dataKey="name" />
                                                    <YAxis />
                                                    <Tooltip />
                                                    <Bar dataKey="avgXP" fill="#10b981" name="Average XP" radius={[4, 4, 0, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                )}

                                {/* Leaderboard Table */}
                                <div className="overflow-hidden rounded-xl border border-slate-200">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-50 border-b border-slate-200">
                                            <tr>
                                                <th className="p-4 font-semibold text-sm text-slate-600">Rank</th>
                                                <th className="p-4 font-semibold text-sm text-slate-600">Student</th>
                                                <th className="p-4 font-semibold text-sm text-slate-600">Completed Modules</th>
                                                <th className="p-4 font-semibold text-sm text-slate-600 text-right">Total XP</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {trainingAnalytics
                                                .sort((a, b) => b.totalXP - a.totalXP)
                                                .map((studentSummary, index) => (
                                                    <tr key={index} className="hover:bg-slate-50 transition-colors">
                                                        <td className="p-4">
                                                            {index === 0 ? <span className="text-yellow-500 font-bold text-lg">#1</span> : 
                                                             index === 1 ? <span className="text-slate-400 font-bold text-lg">#2</span> :
                                                             index === 2 ? <span className="text-amber-600 font-bold text-lg">#3</span> : 
                                                             <span className="text-slate-500 font-medium">#{index + 1}</span>}
                                                        </td>
                                                        <td className="p-4 font-medium text-slate-900">
                                                            {studentSummary.student?.firstName} {studentSummary.student?.lastName}
                                                        </td>
                                                        <td className="p-4 text-slate-600 font-mono">
                                                            {studentSummary.modulesProgress?.filter(m => m.overallProgress >= 100).length || 0}
                                                        </td>
                                                        <td className="p-4 text-right">
                                                            <span className="px-3 py-1 bg-gradient-to-r from-emerald-100 to-green-100 text-green-800 font-bold rounded-full">
                                                                {studentSummary.totalXP} XP
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Add Student Modal */}
                {showAddStudentModal && (
                    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
                            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center text-primary-600">
                                        <UserPlus className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900 text-lg">Add Student to {classData.name}</h3>
                                        <p className="text-xs text-slate-500">Student will be enrolled directly in this class</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowAddStudentModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <form onSubmit={handleCreateStudent} className="space-y-4 mt-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">First Name *</label>
                                        <input
                                            type="text"
                                            required
                                            value={newStudent.firstName}
                                            onChange={(e) => setNewStudent({ ...newStudent, firstName: e.target.value })}
                                            className="input w-full"
                                            placeholder="e.g. Rahul"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Last Name *</label>
                                        <input
                                            type="text"
                                            required
                                            value={newStudent.lastName}
                                            onChange={(e) => setNewStudent({ ...newStudent, lastName: e.target.value })}
                                            className="input w-full"
                                            placeholder="e.g. Sharma"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Student / Admission ID</label>
                                        <input
                                            type="text"
                                            value={newStudent.studentId}
                                            onChange={(e) => setNewStudent({ ...newStudent, studentId: e.target.value })}
                                            className="input w-full font-mono text-sm"
                                            placeholder="e.g. 1001"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Gender *</label>
                                        <select
                                            value={newStudent.gender || 'male'}
                                            onChange={(e) => setNewStudent({ ...newStudent, gender: e.target.value })}
                                            className="input w-full"
                                        >
                                            <option value="male">Male</option>
                                            <option value="female">Female</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                                    <input
                                        type="email"
                                        value={newStudent.email}
                                        onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                                        className="input w-full"
                                        placeholder="Leave blank to auto-generate"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                                    <input
                                        type="tel"
                                        value={newStudent.phone}
                                        onChange={(e) => setNewStudent({ ...newStudent, phone: e.target.value })}
                                        className="input w-full"
                                        placeholder="e.g. +91 9876543210"
                                    />
                                </div>

                                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                    <button
                                        type="button"
                                        onClick={() => setShowAddStudentModal(false)}
                                        className="btn btn-ghost"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="btn btn-primary"
                                    >
                                        {submitting ? 'Adding...' : 'Add Student'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Edit Student Modal */}
                {editingStudent && (
                    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
                            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center text-primary-600">
                                        <Edit2 className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900 text-lg">Edit Student Details</h3>
                                        <p className="text-xs text-slate-500">{editingStudent.firstName} {editingStudent.lastName}</p>
                                    </div>
                                </div>
                                <button onClick={() => setEditingStudent(null)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <form onSubmit={handleUpdateStudent} className="space-y-4 mt-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">First Name *</label>
                                        <input
                                            type="text"
                                            required
                                            value={editStudentData.firstName}
                                            onChange={(e) => setEditStudentData({ ...editStudentData, firstName: e.target.value })}
                                            className="input w-full"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Last Name *</label>
                                        <input
                                            type="text"
                                            required
                                            value={editStudentData.lastName}
                                            onChange={(e) => setEditStudentData({ ...editStudentData, lastName: e.target.value })}
                                            className="input w-full"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Student / Admission ID</label>
                                        <input
                                            type="text"
                                            value={editStudentData.studentId}
                                            onChange={(e) => setEditStudentData({ ...editStudentData, studentId: e.target.value })}
                                            className="input w-full font-mono text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Gender *</label>
                                        <select
                                            value={editStudentData.gender || 'male'}
                                            onChange={(e) => setEditStudentData({ ...editStudentData, gender: e.target.value })}
                                            className="input w-full"
                                        >
                                            <option value="male">Male</option>
                                            <option value="female">Female</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                                    <input
                                        type="email"
                                        required
                                        value={editStudentData.email}
                                        onChange={(e) => setEditStudentData({ ...editStudentData, email: e.target.value })}
                                        className="input w-full"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                                    <input
                                        type="tel"
                                        value={editStudentData.phone}
                                        onChange={(e) => setEditStudentData({ ...editStudentData, phone: e.target.value })}
                                        className="input w-full"
                                    />
                                </div>

                                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                    <button
                                        type="button"
                                        onClick={() => setEditingStudent(null)}
                                        className="btn btn-ghost"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="btn btn-primary"
                                    >
                                        {submitting ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Delete Confirmation Modal */}
                {deletingStudent && (
                    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
                            <div className="flex items-center gap-3 text-red-600 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                                    <Trash2 className="w-5 h-5" />
                                </div>
                                <h3 className="font-bold text-lg text-slate-900">Delete Student Record</h3>
                            </div>
                            <p className="text-slate-600 text-sm mb-6">
                                Are you sure you want to delete <strong className="text-slate-900">{deletingStudent.firstName} {deletingStudent.lastName}</strong>? This action cannot be undone.
                            </p>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setDeletingStudent(null)}
                                    className="btn btn-ghost"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeleteStudent}
                                    disabled={submitting}
                                    className="btn bg-red-600 hover:bg-red-700 text-white"
                                >
                                    {submitting ? 'Deleting...' : 'Delete Student'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
