'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { HardDrive, Users, Settings, Save, RefreshCw, ChevronDown, ChevronUp, Search, AlertCircle, Check, Database } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { storageAPI } from '@/lib/api';
import toast from 'react-hot-toast';

const ROLE_LABELS = {
    student: 'Students',
    instructor: 'Instructors',
    lab_assistant: 'Lab Assistants',
    principal: 'Principals',
    admin: 'Admins'
};

const ROLE_COLORS = {
    student: 'bg-blue-100 text-blue-700 border-blue-200',
    instructor: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    lab_assistant: 'bg-amber-100 text-amber-700 border-amber-200',
    principal: 'bg-purple-100 text-purple-700 border-purple-200',
    admin: 'bg-red-100 text-red-700 border-red-200'
};

export default function StorageManagementPage() {
    const router = useRouter();
    const { user, isAuthenticated, _hasHydrated } = useAuthStore();

    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState([]);
    const [defaults, setDefaults] = useState([]);
    const [users, setUsers] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [sortField, setSortField] = useState('percentUsed');
    const [sortDir, setSortDir] = useState('desc');
    const [editingQuotas, setEditingQuotas] = useState({});
    const [saving, setSaving] = useState(false);
    const [applyingDefaults, setApplyingDefaults] = useState(false);

    // Quick set values
    const [studentQuota, setStudentQuota] = useState(100);
    const [instructorQuota, setInstructorQuota] = useState(1024);

    useEffect(() => {
        if (!_hasHydrated) return;
        if (!isAuthenticated) { router.push('/login'); return; }
        if (!['admin', 'principal'].includes(user?.role)) {
            router.push('/dashboard');
            return;
        }
        loadData();
    }, [_hasHydrated, isAuthenticated, user]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [summaryRes, defaultsRes, usersRes] = await Promise.all([
                storageAPI.getSummary(),
                storageAPI.getDefaults(),
                storageAPI.getUsers()
            ]);
            setSummary(summaryRes.data.data.summary || []);
            setDefaults(defaultsRes.data.data.defaults || []);
            setUsers(usersRes.data.data.users || []);

            // Set initial quota values from defaults
            const studentDefault = defaultsRes.data.data.defaults.find(d => d.role === 'student');
            const instructorDefault = defaultsRes.data.data.defaults.find(d => d.role === 'instructor');
            if (studentDefault) setStudentQuota(studentDefault.quotaMb);
            if (instructorDefault) setInstructorQuota(instructorDefault.quotaMb);
        } catch (err) {
            console.error(err);
            toast.error('Failed to load storage data');
        } finally {
            setLoading(false);
        }
    };

    const handleApplyDefaults = async () => {
        setApplyingDefaults(true);
        try {
            await storageAPI.applyDefaults(studentQuota, instructorQuota);
            toast.success('Default quotas applied to all users');
            loadData();
        } catch (err) {
            toast.error('Failed to apply defaults');
        } finally {
            setApplyingDefaults(false);
        }
    };

    const handleSetRoleQuota = async (role, quotaMb) => {
        try {
            await storageAPI.setDefaultForRole(role, quotaMb);
            toast.success(`Quota updated for ${ROLE_LABELS[role]}`);
            loadData();
        } catch (err) {
            toast.error('Failed to update quota');
        }
    };

    const handleSetUserQuota = async (userId, quotaMb) => {
        setSaving(true);
        try {
            await storageAPI.setQuota(userId, quotaMb);
            toast.success('User quota updated');
            setEditingQuotas(prev => {
                const next = { ...prev };
                delete next[userId];
                return next;
            });
            loadData();
        } catch (err) {
            toast.error('Failed to update user quota');
        } finally {
            setSaving(false);
        }
    };

    const handleRecalculate = async () => {
        try {
            await storageAPI.recalculate();
            toast.success('Storage recalculated');
            loadData();
        } catch (err) {
            toast.error('Failed to recalculate');
        }
    };

    // Filter and sort users
    const filteredUsers = users
        .filter(u => {
            if (roleFilter && u.role !== roleFilter) return false;
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                return (
                    u.firstName?.toLowerCase().includes(q) ||
                    u.lastName?.toLowerCase().includes(q) ||
                    u.email?.toLowerCase().includes(q)
                );
            }
            return true;
        })
        .sort((a, b) => {
            let valA, valB;
            switch (sortField) {
                case 'name':
                    valA = `${a.firstName} ${a.lastName}`.toLowerCase();
                    valB = `${b.firstName} ${b.lastName}`.toLowerCase();
                    break;
                case 'role':
                    valA = a.role;
                    valB = b.role;
                    break;
                case 'quota':
                    valA = a.storageQuotaMb || 0;
                    valB = b.storageQuotaMb || 0;
                    break;
                case 'used':
                    valA = a.storageUsedBytes || 0;
                    valB = b.storageUsedBytes || 0;
                    break;
                case 'percentUsed':
                default:
                    valA = a.percentUsed || 0;
                    valB = b.percentUsed || 0;
                    break;
            }
            if (valA < valB) return sortDir === 'asc' ? -1 : 1;
            if (valA > valB) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });

    const handleSort = (field) => {
        if (sortField === field) {
            setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDir('desc');
        }
    };

    const SortIcon = ({ field }) => {
        if (sortField !== field) return null;
        return sortDir === 'asc' ? <ChevronUp className="w-4 h-4 inline" /> : <ChevronDown className="w-4 h-4 inline" />;
    };

    const formatBytes = (bytes) => {
        if (!bytes) return '0 B';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
        return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
    };

    if (!_hasHydrated || loading) {
        return (
            <div className="p-6 flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <HardDrive className="w-7 h-7 text-primary-600" />
                        Storage Management
                    </h1>
                    <p className="text-slate-500">Manage storage quotas for users by role</p>
                </div>
                <button onClick={handleRecalculate} className="btn btn-secondary">
                    <RefreshCw className="w-4 h-4" /> Recalculate Usage
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                {summary.map(s => (
                    <div key={s.role} className={`card p-4 border-2 ${ROLE_COLORS[s.role] || 'bg-slate-100'}`}>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold">{ROLE_LABELS[s.role]}</span>
                            <Users className="w-5 h-5 opacity-50" />
                        </div>
                        <p className="text-2xl font-bold">{s.userCount}</p>
                        <p className="text-xs mt-1 opacity-80">
                            {s.totalUsedFormatted} used • {s.percentUsed}%
                        </p>
                        <div className="mt-2 h-2 bg-white/50 rounded-full overflow-hidden">
                            <div
                                className={`h-full transition-all ${s.percentUsed >= 90 ? 'bg-red-500' : s.percentUsed >= 70 ? 'bg-yellow-500' : 'bg-emerald-500'}`}
                                style={{ width: `${Math.min(100, s.percentUsed)}%` }}
                            />
                        </div>
                        <p className="text-xs mt-1 opacity-70">Avg: {s.averageQuotaMb >= 1024 ? `${(s.averageQuotaMb / 1024).toFixed(1)} GB` : `${s.averageQuotaMb} MB`}</p>
                    </div>
                ))}
            </div>

            {/* Quick Apply Defaults */}
            <div className="card p-6 mb-6">
                <div className="flex items-center gap-2 mb-4">
                    <Settings className="w-5 h-5 text-slate-600" />
                    <h2 className="text-lg font-semibold text-slate-800">Quick Apply Default Quotas</h2>
                </div>
                <p className="text-sm text-slate-500 mb-4">
                    Set default storage quotas for all users by role. This will update everyone with the specified role.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Student Quota (MB)</label>
                        <input
                            type="number"
                            value={studentQuota}
                            onChange={(e) => setStudentQuota(parseInt(e.target.value) || 0)}
                            className="input w-full"
                            min={0}
                        />
                        <p className="text-xs text-slate-400 mt-1">Recommended: 100 MB</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Instructor Quota (MB)</label>
                        <input
                            type="number"
                            value={instructorQuota}
                            onChange={(e) => setInstructorQuota(parseInt(e.target.value) || 0)}
                            className="input w-full"
                            min={0}
                        />
                        <p className="text-xs text-slate-400 mt-1">Recommended: 1024 MB (1 GB)</p>
                    </div>
                    <div className="flex items-end">
                        <button
                            onClick={handleApplyDefaults}
                            disabled={applyingDefaults}
                            className="btn btn-primary w-full"
                        >
                            {applyingDefaults ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                                <Check className="w-4 h-4" />
                            )}
                            Apply to All Users
                        </button>
                    </div>
                </div>
            </div>

            {/* Role-Based Quota Settings */}
            <div className="card p-6 mb-6">
                <div className="flex items-center gap-2 mb-4">
                    <Database className="w-5 h-5 text-slate-600" />
                    <h2 className="text-lg font-semibold text-slate-800">Quota Settings by Role</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    {defaults.map(d => (
                        <div key={d.role} className="p-4 border border-slate-200 rounded-lg">
                            <label className="block text-sm font-medium text-slate-700 mb-1 capitalize">{ROLE_LABELS[d.role]}</label>
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    defaultValue={d.quotaMb}
                                    id={`quota-${d.role}`}
                                    className="input flex-1 text-sm"
                                    min={0}
                                />
                                <button
                                    onClick={() => {
                                        const input = document.getElementById(`quota-${d.role}`);
                                        handleSetRoleQuota(d.role, parseInt(input.value) || 0);
                                    }}
                                    className="btn btn-secondary text-xs px-3"
                                >
                                    <Save className="w-3 h-3" />
                                </button>
                            </div>
                            <p className="text-xs text-slate-400 mt-1">Current: {d.quotaFormatted}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* User List */}
            <div className="card overflow-hidden">
                <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                    <h2 className="text-lg font-semibold text-slate-800">Individual User Storage</h2>
                    <div className="flex gap-2 flex-wrap">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search users..."
                                className="input pl-9 text-sm w-48"
                            />
                        </div>
                        <select
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                            className="input text-sm"
                        >
                            <option value="">All Roles</option>
                            {Object.entries(ROLE_LABELS).map(([value, label]) => (
                                <option key={value} value={value}>{label}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th onClick={() => handleSort('name')} className="text-left p-3 text-sm font-semibold text-slate-700 cursor-pointer hover:bg-slate-100">
                                    Name <SortIcon field="name" />
                                </th>
                                <th onClick={() => handleSort('role')} className="text-left p-3 text-sm font-semibold text-slate-700 cursor-pointer hover:bg-slate-100 hidden md:table-cell">
                                    Role <SortIcon field="role" />
                                </th>
                                <th onClick={() => handleSort('used')} className="text-left p-3 text-sm font-semibold text-slate-700 cursor-pointer hover:bg-slate-100">
                                    Used <SortIcon field="used" />
                                </th>
                                <th onClick={() => handleSort('quota')} className="text-left p-3 text-sm font-semibold text-slate-700 cursor-pointer hover:bg-slate-100">
                                    Quota <SortIcon field="quota" />
                                </th>
                                <th onClick={() => handleSort('percentUsed')} className="text-left p-3 text-sm font-semibold text-slate-700 cursor-pointer hover:bg-slate-100">
                                    Usage <SortIcon field="percentUsed" />
                                </th>
                                <th className="text-left p-3 text-sm font-semibold text-slate-700">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-slate-500">
                                        No users found
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map(u => (
                                    <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50">
                                        <td className="p-3">
                                            <p className="font-medium text-slate-800">{u.firstName} {u.lastName}</p>
                                            <p className="text-xs text-slate-500">{u.email}</p>
                                        </td>
                                        <td className="p-3 hidden md:table-cell">
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${ROLE_COLORS[u.role] || 'bg-slate-100 text-slate-600'}`}>
                                                {u.role?.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="p-3 text-sm text-slate-600">
                                            {u.usedFormatted}
                                        </td>
                                        <td className="p-3 text-sm text-slate-600">
                                            {editingQuotas[u.id] !== undefined ? (
                                                <input
                                                    type="number"
                                                    value={editingQuotas[u.id]}
                                                    onChange={(e) => setEditingQuotas(prev => ({ ...prev, [u.id]: parseInt(e.target.value) || 0 }))}
                                                    className="input w-24 text-sm"
                                                    min={0}
                                                />
                                            ) : (
                                                u.quotaFormatted
                                            )}
                                        </td>
                                        <td className="p-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full transition-all ${u.percentUsed >= 90 ? 'bg-red-500' : u.percentUsed >= 70 ? 'bg-yellow-500' : 'bg-emerald-500'}`}
                                                        style={{ width: `${Math.min(100, u.percentUsed)}%` }}
                                                    />
                                                </div>
                                                <span className={`text-xs font-medium ${u.percentUsed >= 90 ? 'text-red-600' : u.percentUsed >= 70 ? 'text-yellow-600' : 'text-slate-600'}`}>
                                                    {u.percentUsed}%
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-3">
                                            {editingQuotas[u.id] !== undefined ? (
                                                <div className="flex gap-1">
                                                    <button
                                                        onClick={() => handleSetUserQuota(u.id, editingQuotas[u.id])}
                                                        disabled={saving}
                                                        className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded"
                                                    >
                                                        <Check className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => setEditingQuotas(prev => {
                                                            const next = { ...prev };
                                                            delete next[u.id];
                                                            return next;
                                                        })}
                                                        className="p-1.5 text-slate-400 hover:bg-slate-100 rounded"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => setEditingQuotas(prev => ({ ...prev, [u.id]: u.storageQuotaMb || 100 }))}
                                                    className="btn btn-secondary text-xs px-2 py-1"
                                                >
                                                    Edit Quota
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {filteredUsers.length > 0 && (
                    <div className="p-4 border-t border-slate-200 bg-slate-50 text-sm text-slate-500 flex justify-between">
                        <span>Showing {filteredUsers.length} of {users.length} users</span>
                        <span className="flex items-center gap-1">
                            {users.filter(u => u.percentUsed >= 90).length > 0 && (
                                <span className="flex items-center gap-1 text-red-600">
                                    <AlertCircle className="w-4 h-4" />
                                    {users.filter(u => u.percentUsed >= 90).length} users near limit
                                </span>
                            )}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}
