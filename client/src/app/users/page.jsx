'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Users, Search, Plus, Book, BarChart3, Mail, KeyRound, ToggleLeft, ToggleRight, Trash2, Copy, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import api, { adminAPI } from '@/lib/api';
import toast from 'react-hot-toast';

export default function UsersPage() {
    const router = useRouter();
    const { user, isAuthenticated, accessToken, _hasHydrated, selectedSessionId } = useAuthStore();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);
    const [totalUsers, setTotalUsers] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    // PIN modal state
    const [showPinModal, setShowPinModal] = useState(false);
    const [pinData, setPinData] = useState(null);
    const [generatingPin, setGeneratingPin] = useState(null);

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
    }, [isAuthenticated, _hasHydrated, roleFilter, selectedSessionId, currentPage, itemsPerPage]);

    const loadUsers = async () => {
        setLoading(true);
        try {
            const params = {
                page: currentPage,
                limit: itemsPerPage,
                ...(roleFilter !== 'all' && { role: roleFilter })
            };
            const res = await api.get('/users', { params });
            setUsers(res.data.data.users || []);
            setTotalUsers(res.data.data.pagination?.total || 0);
            setTotalPages(res.data.data.pagination?.pages || 1);
        } catch (error) {
            toast.error('Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [roleFilter, searchQuery]);

    const filteredUsers = users.filter(u =>
        u.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

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
        if (!confirm(`Are you sure you want to delete ${u.firstName} ${u.lastName}?`)) return;
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
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search users..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="input pl-10"
                            />
                        </div>
                        <select
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                            className="input w-full md:w-48"
                        >
                            <option value="all">All Roles</option>
                            <option value="admin">Admin</option>
                            <option value="principal">Principal</option>
                            <option value="instructor">Instructor</option>
                            <option value="student">Student</option>
                            <option value="lab_assistant">Lab Assistant</option>
                            <option value="accountant">Accountant</option>
                        </select>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="card p-4 text-center">
                        <p className="text-2xl font-bold text-primary-600">{users.length}</p>
                        <p className="text-sm text-slate-500">Total Users</p>
                    </div>
                    <div className="card p-4 text-center">
                        <p className="text-2xl font-bold text-emerald-600">
                            {users.filter(u => u.role === 'student').length}
                        </p>
                        <p className="text-sm text-slate-500">Students</p>
                    </div>
                    <div className="card p-4 text-center">
                        <p className="text-2xl font-bold text-blue-600">
                            {users.filter(u => u.role === 'instructor').length}
                        </p>
                        <p className="text-sm text-slate-500">Instructors</p>
                    </div>
                    <div className="card p-4 text-center">
                        <p className="text-2xl font-bold text-amber-600">
                            {users.filter(u => u.isActive).length}
                        </p>
                        <p className="text-sm text-slate-500">Active</p>
                    </div>
                </div>

                {/* Users Table */}
                <div className="card overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="text-left px-6 py-3 text-sm font-medium text-slate-600">Name</th>
                                <th className="text-left px-6 py-3 text-sm font-medium text-slate-600">Email</th>
                                <th className="text-left px-6 py-3 text-sm font-medium text-slate-600">Role</th>
                                <th className="text-left px-6 py-3 text-sm font-medium text-slate-600">ID</th>
                                <th className="text-left px-6 py-3 text-sm font-medium text-slate-600">Status</th>
                                <th className="text-left px-6 py-3 text-sm font-medium text-slate-600">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredUsers.map((u) => (
                                <tr key={u.id} className="hover:bg-slate-50 transition">
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
                                    <td className="px-6 py-4">
                                        <span className={`flex items-center gap-1 text-sm ${u.isActive ? 'text-emerald-600' : 'text-red-500'}`}>
                                            <span className={`w-2 h-2 rounded-full ${u.isActive ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                                            {u.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1">
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
                            ))}
                        </tbody>
                    </table>
                    {filteredUsers.length === 0 && (
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
        </div>
    );
}
