'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    AlertTriangle, Send, Mail, MessageSquare, Phone, CheckCircle2,
    Clock, RefreshCw, Users, ShieldAlert, Sparkles, Filter, ChevronDown,
    ExternalLink, Eye, AlertCircle, Check
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { defaulterEscalationAPI, classesAPI } from '@/lib/api';
import toast from 'react-hot-toast';

export default function DefaultersAdminPage() {
    const router = useRouter();
    const { user, isAuthenticated, _hasHydrated } = useAuthStore();

    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [statusData, setStatusData] = useState(null);
    const [defaulters, setDefaulters] = useState([]);
    const [classes, setClasses] = useState([]);
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedLevel, setSelectedLevel] = useState('all');
    const [selectedStudentIds, setSelectedStudentIds] = useState([]);
    const [activeTab, setActiveTab] = useState('defaulters'); // 'defaulters' | 'logs'
    const [logs, setLogs] = useState([]);

    // Dispatch modal state
    const [showModal, setShowModal] = useState(false);
    const [previewStudent, setPreviewStudent] = useState(null);
    const [selectedChannels, setSelectedChannels] = useState(['whatsapp', 'email', 'in_app']);
    const [isDryRun, setIsDryRun] = useState(false);

    const isAuthorized = user && ['admin', 'principal', 'instructor'].includes(user.role);

    useEffect(() => {
        if (!_hasHydrated) return;
        if (!isAuthenticated) {
            router.push('/login');
            return;
        }
        if (!isAuthorized) {
            router.push('/dashboard');
            return;
        }
        loadInitialData();
    }, [_hasHydrated, isAuthenticated, user]);

    const loadInitialData = async () => {
        setLoading(true);
        try {
            const [statusRes, classesRes] = await Promise.all([
                defaulterEscalationAPI.getStatus().catch(() => ({ data: { data: null } })),
                classesAPI.getAll().catch(() => ({ data: { data: [] } }))
            ]);
            setStatusData(statusRes.data?.data || null);
            setClasses(classesRes.data?.data || []);
            await fetchDefaulters();
        } catch (error) {
            console.error('Failed to load initial data:', error);
            toast.error('Failed to load defaulter data');
        } finally {
            setLoading(false);
        }
    };

    const fetchDefaulters = async (classId = selectedClass) => {
        try {
            const params = {};
            if (classId) params.classId = classId;
            const res = await defaulterEscalationAPI.scan(params);
            setDefaulters(res.data?.data || []);
            setSelectedStudentIds([]);
        } catch (error) {
            console.error('Scan error:', error);
            toast.error('Error scanning for defaulters');
        }
    };

    const fetchLogs = async () => {
        try {
            const res = await defaulterEscalationAPI.getLogs({ limit: 40 });
            setLogs(res.data?.data || []);
        } catch (error) {
            console.error('Logs error:', error);
        }
    };

    const handleSelectAll = () => {
        if (selectedStudentIds.length === filteredDefaulters.length) {
            setSelectedStudentIds([]);
        } else {
            setSelectedStudentIds(filteredDefaulters.map(d => d.studentId));
        }
    };

    const toggleStudent = (id) => {
        setSelectedStudentIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleDispatch = async () => {
        if (selectedStudentIds.length === 0) {
            toast.error('Please select at least one student');
            return;
        }

        setActionLoading(true);
        try {
            const payload = {
                studentIds: selectedStudentIds,
                forceChannels: selectedChannels,
                dryRun: isDryRun
            };
            const res = await defaulterEscalationAPI.dispatch(payload);
            toast.success(res.data?.message || 'Escalation notices processed!');
            setShowModal(false);
            // Refresh counts and logs
            const statusRes = await defaulterEscalationAPI.getStatus();
            setStatusData(statusRes.data?.data || null);
            await fetchDefaulters();
            if (activeTab === 'logs') await fetchLogs();
        } catch (error) {
            console.error('Dispatch error:', error);
            toast.error(error.response?.data?.message || 'Failed to dispatch notices');
        } finally {
            setActionLoading(false);
        }
    };

    const filteredDefaulters = defaulters.filter(d => {
        if (selectedLevel !== 'all' && String(d.escalationLevel) !== selectedLevel) return false;
        return true;
    });

    const getEscalationBadge = (level) => {
        if (level === 3) {
            return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">Level 3: Critical</span>;
        }
        if (level === 2) {
            return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">Level 2: Warning</span>;
        }
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">Level 1: Reminder</span>;
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-5">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="p-2 bg-red-50 text-red-600 rounded-lg">
                            <ShieldAlert className="w-6 h-6" />
                        </span>
                        <h1 className="text-2xl font-bold text-gray-900">Parent Alerts & Defaulter Escalation</h1>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                        Automated multi-channel notifications (WhatsApp, SMS, Email) to parents of students with overdue practicals.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => fetchDefaulters()}
                        disabled={loading}
                        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 shadow-sm"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Scan Now
                    </button>
                    <button
                        onClick={() => {
                            if (selectedStudentIds.length === 0 && filteredDefaulters.length > 0) {
                                setSelectedStudentIds(filteredDefaulters.map(d => d.studentId));
                            }
                            setShowModal(true);
                        }}
                        disabled={filteredDefaulters.length === 0}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 shadow-sm disabled:opacity-50"
                    >
                        <Send className="w-4 h-4" />
                        Dispatch Escalation ({selectedStudentIds.length > 0 ? selectedStudentIds.length : 'All'})
                    </button>
                </div>
            </div>

            {/* Metrics & Gateway Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Defaulters</div>
                    <div className="mt-2 text-3xl font-bold text-gray-900">{statusData?.totalDefaulters ?? defaulters.length}</div>
                    <div className="mt-1 text-xs text-gray-500">Students with overdue coursework</div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <div className="text-xs font-medium text-red-600 uppercase tracking-wider">Level 3 (Critical)</div>
                    <div className="mt-2 text-3xl font-bold text-red-600">{statusData?.levelCounts?.level3 ?? 0}</div>
                    <div className="mt-1 text-xs text-gray-500">7+ days overdue (Parents Alerted)</div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <div className="text-xs font-medium text-amber-600 uppercase tracking-wider">Level 2 (Warning)</div>
                    <div className="mt-2 text-3xl font-bold text-amber-600">{statusData?.levelCounts?.level2 ?? 0}</div>
                    <div className="mt-1 text-xs text-gray-500">3 - 6 days overdue</div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <div className="text-xs font-medium text-blue-600 uppercase tracking-wider">Gateways Active</div>
                    <div className="mt-2 flex items-center gap-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
                            WhatsApp
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            Email
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                            SMS
                        </span>
                    </div>
                    <div className="mt-1 text-xs text-gray-500">Auto-escalation scheduled Mon–Fri 5:00 PM</div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-4 border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('defaulters')}
                    className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === 'defaulters'
                            ? 'border-red-600 text-red-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                >
                    Active Defaulters ({filteredDefaulters.length})
                </button>
                <button
                    onClick={() => {
                        setActiveTab('logs');
                        fetchLogs();
                    }}
                    className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === 'logs'
                            ? 'border-red-600 text-red-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                >
                    Dispatch Audit Logs
                </button>
            </div>

            {/* Active Defaulters Tab */}
            {activeTab === 'defaulters' && (
                <div className="space-y-4">
                    {/* Filters Toolbar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
                        <div className="flex flex-wrap items-center gap-3">
                            <select
                                value={selectedClass}
                                onChange={(e) => {
                                    setSelectedClass(e.target.value);
                                    fetchDefaulters(e.target.value);
                                }}
                                className="text-sm bg-white border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-red-500"
                            >
                                <option value="">All Classes</option>
                                {classes.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>

                            <select
                                value={selectedLevel}
                                onChange={(e) => setSelectedLevel(e.target.value)}
                                className="text-sm bg-white border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-red-500"
                            >
                                <option value="all">All Escalation Levels</option>
                                <option value="3">Level 3: Critical Defaulter (7+ days)</option>
                                <option value="2">Level 2: Warning (3-6 days)</option>
                                <option value="1">Level 1: Reminder (1-2 days)</option>
                            </select>
                        </div>

                        <div className="text-xs text-gray-500">
                            Showing {filteredDefaulters.length} student(s) • {selectedStudentIds.length} selected
                        </div>
                    </div>

                    {/* Defaulters Table */}
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-gray-600">
                                <thead className="bg-gray-50 text-gray-900 text-xs uppercase font-semibold border-b border-gray-200">
                                    <tr>
                                        <th className="p-4 w-10">
                                            <input
                                                type="checkbox"
                                                checked={filteredDefaulters.length > 0 && selectedStudentIds.length === filteredDefaulters.length}
                                                onChange={handleSelectAll}
                                                className="rounded border-gray-300 text-red-600 focus:ring-red-500 h-4 w-4"
                                            />
                                        </th>
                                        <th className="p-4">Student & Class</th>
                                        <th className="p-4">Parent / Guardian Contact</th>
                                        <th className="p-4">Pending Practicals</th>
                                        <th className="p-4">Escalation Tier</th>
                                        <th className="p-4">Channels</th>
                                        <th className="p-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {filteredDefaulters.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="p-8 text-center text-gray-500">
                                                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                                                <p className="font-semibold text-gray-700">No Defaulters Found!</p>
                                                <p className="text-xs text-gray-400 mt-1">All student lab submissions are up-to-date for the selected filter.</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredDefaulters.map(defaulter => (
                                            <tr key={defaulter.studentId} className="hover:bg-gray-50 transition-colors">
                                                <td className="p-4">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedStudentIds.includes(defaulter.studentId)}
                                                        onChange={() => toggleStudent(defaulter.studentId)}
                                                        className="rounded border-gray-300 text-red-600 focus:ring-red-500 h-4 w-4"
                                                    />
                                                </td>
                                                <td className="p-4">
                                                    <div className="font-semibold text-gray-900">{defaulter.studentName}</div>
                                                    <div className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                                                        <span>{defaulter.className}</span>
                                                        <span>•</span>
                                                        <span>Adm: {defaulter.admissionNumber}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="text-gray-900 font-medium">{defaulter.parentName}</div>
                                                    <div className="text-xs text-gray-500 flex flex-col gap-0.5 mt-0.5">
                                                        {defaulter.parentPhone ? (
                                                            <span className="flex items-center gap-1 text-emerald-700 font-mono">
                                                                <Phone className="w-3 h-3" /> {defaulter.parentPhone}
                                                            </span>
                                                        ) : (
                                                            <span className="text-amber-600 text-xs italic">No phone on record</span>
                                                        )}
                                                        {defaulter.parentEmail && (
                                                            <span className="flex items-center gap-1 text-blue-700">
                                                                <Mail className="w-3 h-3" /> {defaulter.parentEmail}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="font-semibold text-red-600">
                                                        {defaulter.items.length} item(s) pending
                                                    </div>
                                                    <div className="text-xs text-gray-500 mt-0.5">
                                                        Max overdue: <span className="font-semibold text-gray-800">{defaulter.maxDaysOverdue} days</span>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    {getEscalationBadge(defaulter.escalationLevel)}
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-1.5">
                                                        {defaulter.hasWhatsAppContact && (
                                                            <span className="p-1 bg-emerald-50 text-emerald-600 rounded" title="WhatsApp Enabled">
                                                                <MessageSquare className="w-3.5 h-3.5" />
                                                            </span>
                                                        )}
                                                        {defaulter.hasEmailContact && (
                                                            <span className="p-1 bg-blue-50 text-blue-600 rounded" title="Email Enabled">
                                                                <Mail className="w-3.5 h-3.5" />
                                                            </span>
                                                        )}
                                                        <span className="p-1 bg-purple-50 text-purple-600 rounded" title="In-App Notification">
                                                            <Users className="w-3.5 h-3.5" />
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-right">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedStudentIds([defaulter.studentId]);
                                                            setPreviewStudent(defaulter);
                                                            setShowModal(true);
                                                        }}
                                                        className="text-xs font-semibold text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded-lg border border-red-200 transition-colors"
                                                    >
                                                        Alert Parent
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Audit Logs Tab */}
            {activeTab === 'logs' && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden p-4">
                    <h2 className="text-base font-semibold text-gray-900 mb-3">Recent Multi-Channel Delivery Logs</h2>
                    {logs.length === 0 ? (
                        <div className="text-center py-8 text-gray-400 text-sm">No delivery logs recorded yet.</div>
                    ) : (
                        <div className="divide-y divide-gray-100 font-mono text-xs">
                            {logs.map((log, idx) => (
                                <div key={idx} className="py-2.5 flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2 py-0.5 rounded font-bold uppercase ${
                                            log.channel === 'whatsapp' ? 'bg-emerald-100 text-emerald-800' :
                                            log.channel === 'email' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                                        }`}>
                                            {log.channel}
                                        </span>
                                        <span className="text-gray-800 font-semibold">{log.to}</span>
                                        {log.simulated && (
                                            <span className="text-amber-600 text-[10px] bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                                SIMULATED
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-gray-400 text-[11px]">
                                        {new Date(log.timestamp).toLocaleString('en-IN')}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Escalation Dispatch Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b pb-3">
                            <div className="flex items-center gap-2 text-red-600 font-bold text-lg">
                                <Send className="w-5 h-5" />
                                <span>Dispatch Defaulter Escalation</span>
                            </div>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                        </div>

                        <p className="text-sm text-gray-600">
                            You are about to dispatch official academic notices to parents of <strong>{selectedStudentIds.length} student(s)</strong> regarding pending lab practical coursework.
                        </p>

                        {/* Channel Selection */}
                        <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Dispatch Channels</label>
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { id: 'whatsapp', label: 'WhatsApp Alert', icon: MessageSquare, color: 'text-emerald-600' },
                                    { id: 'email', label: 'Email Notice', icon: Mail, color: 'text-blue-600' },
                                    { id: 'sms', label: 'SMS Message', icon: Phone, color: 'text-purple-600' },
                                    { id: 'in_app', label: 'In-App Alert', icon: Users, color: 'text-indigo-600' }
                                ].map(ch => {
                                    const Icon = ch.icon;
                                    const isSelected = selectedChannels.includes(ch.id);
                                    return (
                                        <button
                                            key={ch.id}
                                            type="button"
                                            onClick={() => {
                                                setSelectedChannels(prev =>
                                                    prev.includes(ch.id) ? prev.filter(c => c !== ch.id) : [...prev, ch.id]
                                                );
                                            }}
                                            className={`p-2.5 rounded-lg border text-left flex items-center gap-2 text-xs font-medium transition-colors ${
                                                isSelected ? 'border-red-500 bg-red-50 text-red-900' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                                            }`}
                                        >
                                            <Icon className={`w-4 h-4 ${ch.color}`} />
                                            <span>{ch.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Simulation / Dry Run Checkbox */}
                        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200 text-xs text-gray-700">
                            <input
                                type="checkbox"
                                id="dryRunCheck"
                                checked={isDryRun}
                                onChange={(e) => setIsDryRun(e.target.checked)}
                                className="rounded border-gray-300 text-red-600 focus:ring-red-500 h-4 w-4"
                            />
                            <label htmlFor="dryRunCheck" className="cursor-pointer">
                                <strong>Dry Run / Test Mode:</strong> Simulate delivery and log payloads without sending external messages.
                            </label>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-2 pt-2 border-t">
                            <button
                                onClick={() => setShowModal(false)}
                                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDispatch}
                                disabled={actionLoading || selectedChannels.length === 0}
                                className="px-5 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm disabled:opacity-50 flex items-center gap-2"
                            >
                                {actionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                {isDryRun ? 'Run Simulation' : 'Confirm & Dispatch'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
