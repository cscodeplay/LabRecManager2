'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Users, Search, Plus, Book, BarChart3, Mail, KeyRound, ToggleLeft, ToggleRight, Trash2, Copy, X, ChevronLeft, ChevronRight, CheckSquare, Printer, Scissors, Ticket, CheckCircle2, Clock, Eye, ShieldCheck, HelpCircle } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { useConfirm } from '@/components/ConfirmDialog';
import api, { adminAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import BackupCodesPrintModal from '@/components/BackupCodesPrintModal';
import SlipGenerationProgressModal from '@/components/SlipGenerationProgressModal';
import BackupTurnHistoryModal from '@/components/BackupTurnHistoryModal';

export default function UsersPage() {
    const router = useRouter();
    const confirm = useConfirm();
    const { user, isAuthenticated, accessToken, _hasHydrated, selectedSessionId } = useAuthStore();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [accessFilter, setAccessFilter] = useState('all'); // 'all' | 'password_set' | 'pending_first_login' | 'has_backup_codes' | 'used_backup_codes' | 'no_backup_codes'
    const [turnDetailUser, setTurnDetailUser] = useState(null);

    // School-wide scoreboard stats
    const [stats, setStats] = useState({
        total: 0,
        active: 0,
        inactive: 0,
        students: 0,
        instructors: 0,
        studentsPasswordSet: 0,
        studentsPendingPassword: 0,
        totalTurns: 0,
        usedTurns: 0,
        usersWithCodes: 0,
        usersUsedCodes: 0
    });

    // Bulk selection state
    const [selectedUserIds, setSelectedUserIds] = useState(new Set());
    const [bulkLoading, setBulkLoading] = useState(false);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);
    const [totalUsers, setTotalUsers] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    // PIN modal state
    const [showPinModal, setShowPinModal] = useState(false);
    const [pinData, setPinData] = useState(null);
    const [generatingPin, setGeneratingPin] = useState(null);

    // 10-Turn Backup Codes Modal state
    const [showBackupPrintModal, setShowBackupPrintModal] = useState(false);
    const [backupChips, setBackupChips] = useState([]);
    const [generatingBackupId, setGeneratingBackupId] = useState(null);
    const [bulkBackupLoading, setBulkBackupLoading] = useState(false);

    // Slip Generation Progress Animation Modal State
    const [showGenProgress, setShowGenProgress] = useState(false);
    const [genProgress, setGenProgress] = useState(0);
    const [genStatusText, setGenStatusText] = useState('Initializing credential generation...');
    const [genTargetName, setGenTargetName] = useState('');
    const [genCount, setGenCount] = useState(1);

    // Debounce search input by 300ms
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(searchQuery.trim());
        }, 300);
        return () => clearTimeout(handler);
    }, [searchQuery]);

    // Reset page to 1 on filter or search change
    useEffect(() => {
        setCurrentPage(1);
    }, [roleFilter, accessFilter, debouncedSearch]);

    useEffect(() => {
        if (!_hasHydrated) return;
        if (!isAuthenticated) {
            router.push('/login');
            return;
        }
        if (user?.role !== 'admin' && user?.role !== 'principal') {
            router.push('/dashboard');
            return;
        }
        loadUsers();
    }, [isAuthenticated, _hasHydrated, roleFilter, accessFilter, selectedSessionId, currentPage, itemsPerPage, debouncedSearch]);

    const loadUsers = async () => {
        setLoading(true);
        try {
            const params = {
                page: currentPage,
                limit: itemsPerPage,
                ...(roleFilter !== 'all' && { role: roleFilter }),
                ...(accessFilter !== 'all' && { accessStatus: accessFilter }),
                ...(debouncedSearch && { search: debouncedSearch })
            };
            const res = await api.get('/users', { params });
            setUsers(res.data.data.users || []);
            setTotalUsers(res.data.data.pagination?.total || 0);
            setTotalPages(res.data.data.pagination?.pages || 1);
            if (res.data.data.stats) {
                setStats(res.data.data.stats);
            }
        } catch (error) {
            toast.error('Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    const getRoleBadge = (role) => {
        const styles = {
            admin: 'bg-purple-100 text-purple-700',
            principal: 'bg-amber-100 text-amber-700',
            instructor: 'bg-blue-100 text-blue-700',
            student: 'bg-emerald-100 text-emerald-700',
            lab_assistant: 'bg-cyan-100 text-cyan-700',
            accountant: 'bg-pink-100 text-pink-700'
        };
        return styles[role] || 'bg-slate-100 text-slate-700';
    };

    // Generate PIN handler
    const handleGeneratePin = async (u) => {
        if (u.role !== 'student') {
            toast.error('PIN can only be generated for students');
            return;
        }
        setGeneratingPin(u.id);
        try {
            const res = await adminAPI.generatePin(u.id);
            if (res.data.success) {
                setPinData({ ...res.data.data, email: u.email, studentName: `${u.firstName} ${u.lastName}` });
                setShowPinModal(true);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to generate PIN');
        } finally {
            setGeneratingPin(null);
        }
    };

    // Generate 10-turn emergency backup codes for a single user
    const handleGenerateBackupCodes = async (u) => {
        setGeneratingBackupId(u.id);
        setGenTargetName(`${u.firstName} ${u.lastName}`);
        setGenCount(1);
        setGenProgress(20);
        setGenStatusText('Validating security access & credentials...');
        setShowGenProgress(true);

        const timer1 = setTimeout(() => {
            setGenProgress(55);
            setGenStatusText('Generating 6-digit PIN & 10 emergency turns...');
        }, 300);

        const timer2 = setTimeout(() => {
            setGenProgress(80);
            setGenStatusText('Hashing with bcrypt & formatting paper slip...');
        }, 700);

        try {
            const res = await adminAPI.generateBackupCodes(u.id);
            clearTimeout(timer1);
            clearTimeout(timer2);
            if (res.data.success) {
                setGenProgress(100);
                setGenStatusText('Slip generated successfully!');
                setTimeout(() => {
                    setShowGenProgress(false);
                    setBackupChips([res.data.data]);
                    setShowBackupPrintModal(true);
                    toast.success(`Generated 10 backup codes for ${u.firstName} ${u.lastName}`);
                }, 400);
            }
        } catch (error) {
            clearTimeout(timer1);
            clearTimeout(timer2);
            setShowGenProgress(false);
            toast.error(error.response?.data?.message || 'Failed to generate backup codes');
        } finally {
            setGeneratingBackupId(null);
        }
    };

    // Bulk generate 10-turn backup codes for all selected users
    const handleBulkGenerateBackupCodes = async () => {
        if (selectedUserIds.size === 0) return;
        const count = selectedUserIds.size;
        const ok = await confirm({
            title: `Print Backup Slips for ${count} Users`,
            message: `This will generate 10 fresh emergency backup codes and 1st-time login PINs for ${count} selected users and prepare the A4 print sheet with cutting guides. Continue?`,
            confirmText: 'Generate & Print Slips',
            cancelText: 'Cancel',
            type: 'primary'
        });
        if (!ok) return;

        setBulkBackupLoading(true);
        setGenTargetName('');
        setGenCount(count);
        setGenProgress(15);
        setGenStatusText(`Fetching user roster for ${count} students...`);
        setShowGenProgress(true);

        const timer1 = setTimeout(() => {
            setGenProgress(40);
            setGenStatusText(`Generating PINs & 10-turn backup codes for ${count} users...`);
        }, 400);

        const timer2 = setTimeout(() => {
            setGenProgress(70);
            setGenStatusText(`Hashing credentials with bcrypt & batch updating database...`);
        }, 900);

        const timer3 = setTimeout(() => {
            setGenProgress(90);
            setGenStatusText(`Formatting A4 printable cut-sheets & scissor guides...`);
        }, 1500);

        try {
            const res = await adminAPI.bulkGenerateBackupCodes(Array.from(selectedUserIds));
            clearTimeout(timer1);
            clearTimeout(timer2);
            clearTimeout(timer3);
            if (res.data.success && res.data.data?.length > 0) {
                setGenProgress(100);
                setGenStatusText(`Ready! ${res.data.data.length} slips generated successfully.`);
                setTimeout(() => {
                    setShowGenProgress(false);
                    setBackupChips(res.data.data);
                    setShowBackupPrintModal(true);
                    toast.success(`Generated backup slips for ${res.data.data.length} users`);
                }, 450);
            } else {
                setShowGenProgress(false);
                toast.error(res.data.message || 'No slips generated');
            }
        } catch (error) {
            clearTimeout(timer1);
            clearTimeout(timer2);
            clearTimeout(timer3);
            setShowGenProgress(false);
            toast.error(error.response?.data?.message || 'Failed to bulk generate backup codes');
        } finally {
            setBulkBackupLoading(false);
        }
    };

    // Toggle active status
    const handleToggleActive = async (u) => {
        try {
            await api.put(`/users/${u.id}`, { isActive: !u.isActive });
            toast.success(u.isActive ? 'User deactivated' : 'User activated');
            loadUsers();
        } catch (error) {
            toast.error('Failed to update user status');
        }
    };

    // Delete user
    const handleDeleteUser = async (u) => {
        const ok = await confirm({
            title: `Delete User: ${u.firstName} ${u.lastName}`,
            message: `Are you sure you want to permanently remove ${u.firstName} ${u.lastName} (${u.email || u.role})? All associated records may be impacted.`,
            confirmText: 'Delete User',
            cancelText: 'Cancel',
            type: 'danger',
        });
        if (!ok) return;

        try {
            await api.delete(`/users/${u.id}`);
            toast.success('User deleted');
            loadUsers();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to delete user');
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        toast.success('Copied to clipboard');
    };

    // Bulk selection helpers
    const isAllSelected = users.length > 0 && users.every(u => selectedUserIds.has(u.id));
    const isSomeSelected = users.some(u => selectedUserIds.has(u.id)) && !isAllSelected;

    const handleSelectAll = (e) => {
        const next = new Set(selectedUserIds);
        if (e.target.checked) {
            users.forEach(u => next.add(u.id));
        } else {
            users.forEach(u => next.delete(u.id));
        }
        setSelectedUserIds(next);
    };

    const handleSelectUser = (id) => {
        const next = new Set(selectedUserIds);
        if (next.has(id)) {
            next.delete(id);
        } else {
            next.add(id);
        }
        setSelectedUserIds(next);
    };

    const clearSelection = () => {
        setSelectedUserIds(new Set());
    };

    // Bulk Deactivate
    const handleBulkDeactivate = async () => {
        if (selectedUserIds.size === 0) return;
        const count = selectedUserIds.size;
        const ok = await confirm({
            title: `Deactivate ${count} User(s)`,
            message: `Are you sure you want to deactivate ${count} selected user(s)? Deactivated users will not be able to log in.`,
            confirmText: 'Deactivate Users',
            cancelText: 'Cancel',
            type: 'warning'
        });
        if (!ok) return;

        setBulkLoading(true);
        try {
            const res = await api.post('/users/bulk-status', {
                userIds: Array.from(selectedUserIds),
                isActive: false
            });
            toast.success(res.data.message || `Deactivated ${count} users`);
            clearSelection();
            loadUsers();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to deactivate users');
        } finally {
            setBulkLoading(false);
        }
    };

    // Bulk Activate
    const handleBulkActivate = async () => {
        if (selectedUserIds.size === 0) return;
        const count = selectedUserIds.size;
        setBulkLoading(true);
        try {
            const res = await api.post('/users/bulk-status', {
                userIds: Array.from(selectedUserIds),
                isActive: true
            });
            toast.success(res.data.message || `Activated ${count} users`);
            clearSelection();
            loadUsers();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to activate users');
        } finally {
            setBulkLoading(false);
        }
    };

    // Bulk Delete (Soft or Permanent)
    const handleBulkDelete = async (permanent = false) => {
        if (selectedUserIds.size === 0) return;
        const count = selectedUserIds.size;
        const ok = await confirm({
            title: permanent ? `Permanently Delete ${count} User(s)` : `Bulk Delete / Deactivate ${count} User(s)`,
            message: permanent
                ? `CAUTION: Are you sure you want to PERMANENTLY DELETE ${count} selected user(s)? All their enrollments, submissions, and records will be purged from the database. This action CANNOT be undone.`
                : `Are you sure you want to delete ${count} selected user(s)? They will be marked as inactive and soft-deleted.`,
            confirmText: permanent ? 'Permanently Delete' : 'Delete Users',
            cancelText: 'Cancel',
            type: 'danger'
        });
        if (!ok) return;

        setBulkLoading(true);
        try {
            const res = await api.post('/users/bulk-delete', {
                userIds: Array.from(selectedUserIds),
                permanent
            });
            toast.success(res.data.message || `Processed ${count} users`);
            clearSelection();
            loadUsers();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to delete users');
        } finally {
            setBulkLoading(false);
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
            <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard" className="text-slate-500 hover:text-slate-700">
                            ← Back
                        </Link>
                        <h1 className="text-xl font-semibold text-slate-900">Users</h1>
                    </div>
                    <Link href="/users/create" className="btn btn-primary">
                        <Plus className="w-4 h-4" />
                        Add User
                    </Link>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-6">
                {/* Filters */}
                <div className="card p-4 mb-6">
                    <div className="flex flex-col md:flex-row gap-3">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search users by name, email, admission/student ID..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="input pl-10"
                            />
                        </div>
                        <select
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                            className="input w-full md:w-44"
                        >
                            <option value="all">All Roles</option>
                            <option value="admin">Admin</option>
                            <option value="principal">Principal</option>
                            <option value="instructor">Instructor</option>
                            <option value="student">Student</option>
                            <option value="lab_assistant">Lab Assistant</option>
                            <option value="accountant">Accountant</option>
                        </select>
                        <select
                            value={accessFilter}
                            onChange={(e) => setAccessFilter(e.target.value)}
                            className="input w-full md:w-56 font-medium text-slate-700"
                        >
                            <option value="all">All Password Status</option>
                            <option value="password_set">✓ Password Configured</option>
                            <option value="pending_first_login">⏳ Pending 1st Login / Reset</option>
                            <option value="has_backup_codes">🎟 Has Backup Codes</option>
                            <option value="used_backup_codes">⚠️ Used Backup Codes</option>
                            <option value="no_backup_codes">No Slips Issued</option>
                        </select>
                    </div>
                </div>

                {/* Scoreboard Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
                    {/* 1. Total Users */}
                    <div className="card p-3.5 text-center bg-white border border-slate-200">
                        <p className="text-xl sm:text-2xl font-black text-slate-900">{stats.total || totalUsers || users.length}</p>
                        <p className="text-xs font-semibold text-slate-600 mt-0.5">Total Users</p>
                        <p className="text-[10px] text-slate-400 font-medium">{stats.active ?? 0} active accounts</p>
                    </div>

                    {/* 2. Total Students */}
                    <div className="card p-3.5 text-center bg-white border border-slate-200">
                        <p className="text-xl sm:text-2xl font-black text-primary-600">
                            {stats.students ?? users.filter(u => u.role === 'student').length}
                        </p>
                        <p className="text-xs font-semibold text-slate-600 mt-0.5">Total Students</p>
                        <p className="text-[10px] text-primary-600 font-medium">Registered Roster</p>
                    </div>

                    {/* 3. Passwords Configured / Set */}
                    <div className="card p-3.5 text-center bg-emerald-50/60 border border-emerald-200 shadow-2xs">
                        <div className="flex items-center justify-center gap-1">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <p className="text-xl sm:text-2xl font-black text-emerald-700">{stats.studentsPasswordSet ?? 0}</p>
                        </div>
                        <p className="text-xs font-bold text-emerald-900 mt-0.5">Passwords Set</p>
                        <p className="text-[10px] text-emerald-700 font-semibold">
                            {stats.students > 0 ? `${Math.round(((stats.studentsPasswordSet || 0) / stats.students) * 100)}% Activated` : 'Ready'}
                        </p>
                    </div>

                    {/* 4. Pending 1st Login / Reset */}
                    <div className="card p-3.5 text-center bg-amber-50/60 border border-amber-200 shadow-2xs">
                        <div className="flex items-center justify-center gap-1">
                            <Clock className="w-4 h-4 text-amber-600" />
                            <p className="text-xl sm:text-2xl font-black text-amber-700">{stats.studentsPendingPassword ?? 0}</p>
                        </div>
                        <p className="text-xs font-bold text-amber-900 mt-0.5">Pending 1st Login</p>
                        <p className="text-[10px] text-amber-700 font-semibold">Needs PIN / Slip</p>
                    </div>

                    {/* 5. Backup Slips Issued */}
                    <div className="card p-3.5 text-center bg-indigo-50/60 border border-indigo-200 shadow-2xs">
                        <div className="flex items-center justify-center gap-1">
                            <Ticket className="w-4 h-4 text-indigo-600" />
                            <p className="text-xl sm:text-2xl font-black text-indigo-700">{stats.usersWithCodes ?? 0}</p>
                        </div>
                        <p className="text-xs font-bold text-indigo-900 mt-0.5">Slips Printed</p>
                        <p className="text-[10px] text-indigo-700 font-semibold">{stats.totalTurns ?? 0} turns total</p>
                    </div>

                    {/* 6. Turns Burned / Consumed */}
                    <div className="card p-3.5 text-center bg-rose-50/60 border border-rose-200 shadow-2xs">
                        <div className="flex items-center justify-center gap-1">
                            <AlertTriangle className="w-4 h-4 text-rose-600" />
                            <p className="text-xl sm:text-2xl font-black text-rose-700">{stats.usedTurns ?? 0}</p>
                        </div>
                        <p className="text-xs font-bold text-rose-900 mt-0.5">Turns Used</p>
                        <p className="text-[10px] text-rose-700 font-semibold">
                            {stats.usersUsedCodes ? `${stats.usersUsedCodes} student(s)` : '0 burned'}
                        </p>
                    </div>
                </div>

                {/* Bulk Actions Bar */}
                {selectedUserIds.size > 0 && (
                    <div className="card p-4 mb-6 bg-primary-50/70 border-primary-200 border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-in fade-in">
                        <div className="flex items-center gap-3">
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary-600 text-white font-bold text-xs shadow-xs">
                                {selectedUserIds.size}
                            </span>
                            <span className="text-sm font-semibold text-primary-950">
                                {selectedUserIds.size} {selectedUserIds.size === 1 ? 'user' : 'users'} selected
                            </span>
                            <button
                                onClick={clearSelection}
                                className="text-xs text-primary-700 hover:text-primary-900 underline font-medium ml-1 cursor-pointer"
                            >
                                Clear selection
                            </button>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <button
                                onClick={handleBulkGenerateBackupCodes}
                                disabled={bulkLoading || bulkBackupLoading}
                                className="btn btn-sm bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold py-1.5 px-3 rounded-lg shadow-2xs flex items-center gap-1.5 cursor-pointer"
                                title="Generate 10-turn backup slips for selected users and open A4 print sheet"
                            >
                                <Printer className="w-3.5 h-3.5 text-white" />
                                {bulkBackupLoading ? 'Preparing Slips...' : 'Print Backup Slips (A4)'}
                            </button>
                            <button
                                onClick={handleBulkActivate}
                                disabled={bulkLoading}
                                className="btn btn-sm bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-50 text-xs font-semibold py-1.5 px-3 rounded-lg shadow-2xs"
                                title="Activate selected users"
                            >
                                <ToggleLeft className="w-3.5 h-3.5 text-emerald-600" />
                                Activate
                            </button>
                            <button
                                onClick={handleBulkDeactivate}
                                disabled={bulkLoading}
                                className="btn btn-sm bg-white border border-amber-300 text-amber-700 hover:bg-amber-50 text-xs font-semibold py-1.5 px-3 rounded-lg shadow-2xs"
                                title="Deactivate selected users"
                            >
                                <ToggleRight className="w-3.5 h-3.5 text-amber-600" />
                                Deactivate
                            </button>
                            <button
                                onClick={() => handleBulkDelete(false)}
                                disabled={bulkLoading}
                                className="btn btn-sm bg-white border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-semibold py-1.5 px-3 rounded-lg shadow-2xs"
                                title="Bulk delete (deactivate) selected users"
                            >
                                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                Bulk Delete
                            </button>
                            <button
                                onClick={() => handleBulkDelete(true)}
                                disabled={bulkLoading}
                                className="btn btn-sm bg-rose-600 text-white hover:bg-rose-700 text-xs font-semibold py-1.5 px-3 rounded-lg shadow-2xs"
                                title="Permanently delete from database"
                            >
                                <Trash2 className="w-3.5 h-3.5 text-white" />
                                Permanent Delete
                            </button>
                        </div>
                    </div>
                )}

                {/* Users Table */}
                <div className="card overflow-hidden">
                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full min-w-[650px]">
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr>
                                    <th className="px-4 py-3 w-10 text-center">
                                        <input
                                            type="checkbox"
                                            checked={isAllSelected}
                                            ref={(el) => {
                                                if (el) el.indeterminate = isSomeSelected;
                                            }}
                                            onChange={handleSelectAll}
                                            className="w-4 h-4 rounded text-primary-600 border-slate-300 focus:ring-primary-500 cursor-pointer"
                                            aria-label="Select all users on this page"
                                        />
                                    </th>
                                    <th className="text-left px-6 py-3 text-sm font-medium text-slate-600">Name</th>
                                    <th className="text-left px-6 py-3 text-sm font-medium text-slate-600">Email</th>
                                    <th className="text-left px-6 py-3 text-sm font-medium text-slate-600">Role</th>
                                    <th className="text-left px-6 py-3 text-sm font-medium text-slate-600">ID</th>
                                    <th className="text-left px-6 py-3 text-sm font-medium text-slate-600">Password Status</th>
                                    <th className="text-left px-6 py-3 text-sm font-medium text-slate-600">Backup Slips</th>
                                    <th className="text-left px-6 py-3 text-sm font-medium text-slate-600">Status</th>
                                    <th className="text-left px-6 py-3 text-sm font-medium text-slate-600">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {users.map((u) => {
                                    const isSelected = selectedUserIds.has(u.id);
                                    return (
                                        <tr key={u.id} className={`${isSelected ? 'bg-primary-50/40 hover:bg-primary-50/70' : 'hover:bg-slate-50'} transition`}>
                                            <td className="px-4 py-4 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => handleSelectUser(u.id)}
                                                    className="w-4 h-4 rounded text-primary-600 border-slate-300 focus:ring-primary-500 cursor-pointer"
                                                    aria-label={`Select ${u.firstName} ${u.lastName}`}
                                                />
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-medium">
                                                        {u.firstName?.[0]}{u.lastName?.[0]}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-slate-900">
                                                            {u.firstName} {u.lastName}
                                                        </p>
                                                        {u.firstNameHindi && (
                                                            <p className="text-sm text-slate-500">{u.firstNameHindi} {u.lastNameHindi}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600">{u.email}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadge(u.role)}`}>
                                                    {u.role.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 font-mono text-sm">
                                                {u.studentId || u.admissionNumber || u.employeeId || '-'}
                                            </td>
                                            {/* Password Status */}
                                            <td className="px-6 py-4">
                                                {u.role === 'student' ? (
                                                    u.mustChangePassword ? (
                                                        <div className="flex flex-col items-start gap-0.5">
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300 shadow-2xs">
                                                                <Clock className="w-3.5 h-3.5 text-amber-600" />
                                                                Pending 1st Login
                                                            </span>
                                                            <span className="text-[10px] text-amber-700 font-medium">
                                                                {u.hasPinGenerated ? 'PIN / Slip Issued' : 'No PIN Set'}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col items-start gap-0.5">
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs">
                                                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                                                Password Set
                                                            </span>
                                                            {u.lastLogin ? (
                                                                <span className="text-[10px] text-slate-400 font-mono">
                                                                    Active {new Date(u.lastLogin).toLocaleDateString()}
                                                                </span>
                                                            ) : (
                                                                <span className="text-[10px] text-emerald-600 font-medium">
                                                                    Configured
                                                                </span>
                                                            )}
                                                        </div>
                                                    )
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                                                        <CheckCircle2 className="w-3 h-3 text-slate-500" />
                                                        Configured
                                                    </span>
                                                )}
                                            </td>
                                            {/* Emergency Backup Codes */}
                                            <td className="px-6 py-4">
                                                {u.backupStats?.hasCodes ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => setTurnDetailUser(u)}
                                                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border shadow-2xs group text-left ${
                                                            u.backupStats.usedTurns > 0
                                                                ? 'bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100'
                                                                : 'bg-indigo-50 border-indigo-200 text-indigo-900 hover:bg-indigo-100'
                                                        }`}
                                                        title="Click to view turn-by-turn audit history"
                                                    >
                                                        <Ticket className={`w-3.5 h-3.5 ${u.backupStats.usedTurns > 0 ? 'text-amber-600' : 'text-indigo-600'}`} />
                                                        <span>
                                                            {u.backupStats.usedTurns > 0 ? (
                                                                <span className="font-extrabold text-amber-800">
                                                                    {u.backupStats.usedTurns}/10 Used
                                                                </span>
                                                            ) : (
                                                                <span className="font-semibold text-indigo-800">
                                                                    10 Available
                                                                </span>
                                                            )}
                                                        </span>
                                                        <Eye className="w-3 h-3 text-slate-400 opacity-60 group-hover:opacity-100 transition" />
                                                    </button>
                                                ) : (
                                                    <span className="text-xs text-slate-400 italic">
                                                        No slips issued
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`flex items-center gap-1 text-sm ${u.isActive ? 'text-emerald-600' : 'text-red-500'}`}>
                                                    <span className={`w-2 h-2 rounded-full ${u.isActive ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                                                    {u.isActive ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => handleGenerateBackupCodes(u)}
                                                        disabled={generatingBackupId === u.id}
                                                        className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded"
                                                        title={`Generate 10-Turn Emergency Backup Codes (${u.role})`}
                                                    >
                                                        <Ticket className="w-4 h-4" />
                                                    </button>
                                                    {u.role === 'student' && (
                                                        <button
                                                            onClick={() => handleGeneratePin(u)}
                                                            disabled={generatingPin === u.id}
                                                            className="p-1.5 text-amber-600 hover:bg-amber-50 rounded"
                                                            title="Generate PIN"
                                                        >
                                                            <KeyRound className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleToggleActive(u)}
                                                        className={`p-1.5 rounded ${u.isActive ? 'text-slate-500 hover:bg-slate-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
                                                        title={u.isActive ? 'Deactivate' : 'Activate'}
                                                    >
                                                        {u.isActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteUser(u)}
                                                        className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                                                        title="Delete user"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile User Cards */}
                    <div className="md:hidden divide-y divide-slate-100">
                        {users.map((u) => {
                            const isSelected = selectedUserIds.has(u.id);
                            return (
                                <div key={`mob-${u.id}`} className={`p-4 transition ${isSelected ? 'bg-primary-50/40' : 'bg-white hover:bg-slate-50'}`}>
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => handleSelectUser(u.id)}
                                                className="w-4 h-4 rounded text-primary-600 border-slate-300 focus:ring-primary-500 cursor-pointer shrink-0 mt-0.5"
                                                aria-label={`Select ${u.firstName} ${u.lastName}`}
                                            />
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-medium shrink-0">
                                                {u.firstName?.[0]}{u.lastName?.[0]}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="font-semibold text-slate-900 truncate">
                                                    {u.firstName} {u.lastName}
                                                </p>
                                                {u.firstNameHindi && (
                                                    <p className="text-xs text-slate-500 truncate">{u.firstNameHindi} {u.lastNameHindi}</p>
                                                )}
                                                <p className="text-xs text-slate-500 truncate mt-0.5">{u.email}</p>
                                            </div>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${getRoleBadge(u.role)}`}>
                                            {u.role.replace('_', ' ')}
                                        </span>
                                    </div>

                                <div className="flex items-center justify-between text-xs text-slate-500 mt-3 pt-2.5 border-t border-slate-100">
                                    <div>
                                        <span className="text-slate-400">ID: </span>
                                        <span className="font-mono text-slate-700 font-bold">{u.studentId || u.admissionNumber || u.employeeId || '-'}</span>
                                    </div>
                                    <span className={`flex items-center gap-1.5 font-medium ${u.isActive ? 'text-emerald-600' : 'text-red-500'}`}>
                                        <span className={`w-2 h-2 rounded-full ${u.isActive ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                                        {u.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </div>

                                {/* Mobile Password & Backup Badges */}
                                <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-slate-100 flex-wrap gap-1.5">
                                    <div className="flex items-center gap-1">
                                        {u.role === 'student' ? (
                                            u.mustChangePassword ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                                                    <Clock className="w-3 h-3 text-amber-600" /> Pending 1st Login
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Password Set
                                                </span>
                                            )
                                        ) : (
                                            <span className="text-slate-500 text-[11px]">Password Configured</span>
                                        )}
                                    </div>
                                    {u.backupStats?.hasCodes ? (
                                        <button
                                            type="button"
                                            onClick={() => setTurnDetailUser(u)}
                                            className={`text-[11px] font-bold px-2 py-0.5 rounded border ${
                                                u.backupStats.usedTurns > 0
                                                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                                                    : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                            }`}
                                        >
                                            {u.backupStats.usedTurns > 0 ? `${u.backupStats.usedTurns}/10 Used` : '10 Turns Ready'}
                                        </button>
                                    ) : null}
                                </div>

                                {/* Touch Actions Bar */}
                                <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-100 flex-wrap">
                                    <button
                                        onClick={() => handleGenerateBackupCodes(u)}
                                        disabled={generatingBackupId === u.id}
                                        className="py-1.5 px-2.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 flex items-center justify-center gap-1.5 transition"
                                        title="10-Turn Backup Codes"
                                    >
                                        <Ticket className="w-3.5 h-3.5" /> 10 Codes
                                    </button>
                                    {u.role === 'student' && (
                                        <button
                                            onClick={() => handleGeneratePin(u)}
                                            disabled={generatingPin === u.id}
                                            className="flex-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 flex items-center justify-center gap-1.5 transition"
                                        >
                                            <KeyRound className="w-3.5 h-3.5" /> PIN
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleToggleActive(u)}
                                        className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                                            u.isActive ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                        }`}
                                    >
                                        {u.isActive ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                                        {u.isActive ? 'Deactivate' : 'Activate'}
                                    </button>
                                    <button
                                        onClick={() => handleDeleteUser(u)}
                                        className="py-1.5 px-3 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 flex items-center justify-center gap-1.5 transition"
                                        title="Delete user"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" /> Delete
                                    </button>
                                </div>
                            </div>
                            );
                        })}
                    </div>
                    {users.length === 0 && (
                        <div className="p-12 text-center text-slate-500">
                            No users found matching your criteria
                        </div>
                    )}

                    {/* Pagination Controls */}
                    {totalPages > 0 && (
                        <div className="flex items-center justify-between p-4 border-t border-slate-200">
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                <span>Showing {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, totalUsers)} of {totalUsers}</span>
                                <select
                                    value={itemsPerPage}
                                    onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                                    className="input py-1 px-2 text-sm w-20"
                                >
                                    <option value={10}>10</option>
                                    <option value={20}>20</option>
                                    <option value={50}>50</option>
                                    <option value={100}>100</option>
                                </select>
                                <span>per page</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setCurrentPage(1)}
                                    disabled={currentPage === 1}
                                    className="px-2 py-1 rounded hover:bg-slate-100 disabled:opacity-50 text-sm"
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
                                <span className="px-3 py-1 bg-primary-50 text-primary-700 rounded font-medium text-sm">
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
                                    className="px-2 py-1 rounded hover:bg-slate-100 disabled:opacity-50 text-sm"
                                >
                                    Last
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* PIN Modal */}
            {showPinModal && pinData && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full">
                        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                            <h3 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                                <KeyRound className="w-5 h-5 text-amber-500" />
                                Login PIN Generated
                            </h3>
                            <button onClick={() => { setShowPinModal(false); setPinData(null); }} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                                <p className="text-sm text-amber-700 mb-1">Student: <strong>{pinData.studentName}</strong></p>
                                <p className="text-sm text-amber-700">Email: <strong>{pinData.email}</strong></p>
                            </div>

                            <div className="text-center mb-4">
                                <p className="text-sm text-slate-500 mb-2">6-Digit PIN</p>
                                <div className="flex items-center justify-center gap-2">
                                    <span className="text-4xl font-mono font-bold text-slate-900 tracking-widest bg-slate-100 px-6 py-3 rounded-xl">
                                        {pinData.pin}
                                    </span>
                                    <button onClick={() => copyToClipboard(pinData.pin)} className="p-2 hover:bg-slate-100 rounded-lg">
                                        <Copy className="w-5 h-5 text-slate-500" />
                                    </button>
                                </div>
                            </div>

                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                                <p className="font-medium mb-1">Instructions:</p>
                                <ol className="list-decimal list-inside space-y-1">
                                    <li>Share PIN with student</li>
                                    <li>Login page → "First time? Use PIN"</li>
                                    <li>Enter email + PIN → Set password</li>
                                </ol>
                            </div>

                            <p className="text-xs text-slate-500 mt-3 text-center">
                                PIN expires: {new Date(pinData.expiresAt).toLocaleString()}
                            </p>
                        </div>
                        <div className="p-4 border-t border-slate-200">
                            <button
                                onClick={() => { setShowPinModal(false); setPinData(null); }}
                                className="btn btn-primary w-full"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Slip Generation Loading Animation & Progress Modal */}
            <SlipGenerationProgressModal
                isOpen={showGenProgress}
                progress={genProgress}
                statusText={genStatusText}
                userCount={genCount}
                targetName={genTargetName}
            />

            {/* 10-Turn Emergency Backup Codes A4 Printable Modal */}
            <BackupCodesPrintModal
                isOpen={showBackupPrintModal}
                onClose={() => {
                    setShowBackupPrintModal(false);
                    setBackupChips([]);
                }}
                chips={backupChips}
                defaultSchoolName={user?.school?.name || user?.schoolName || ''}
                defaultSchoolLogo={user?.school?.logoUrl || user?.schoolLogo || ''}
            />

            {/* Turn History & Password Audit Modal */}
            <BackupTurnHistoryModal
                isOpen={!!turnDetailUser}
                user={turnDetailUser}
                onClose={() => setTurnDetailUser(null)}
                onRegenerate={(u) => handleGenerateBackupCodes(u)}
            />
        </div>
    );
}
