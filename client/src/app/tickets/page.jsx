'use client';
import { useState, useEffect } from 'react';
import { ticketsAPI, labsAPI, dashboardAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { toast } from 'react-hot-toast';
import { formatDate, formatDateTime, formatRelativeTime } from '@/lib/dateUtils';
import {
    Ticket, Plus, Filter, Search, Clock, CheckCircle2, AlertCircle,
    MessageSquare, User, Monitor, Building2, ChevronRight, X, Send,
    Zap, Laptop, Server, Tv, Printer, Radio, Wifi, Copy, Check
} from 'lucide-react';
import AICardCopilot from '@/components/AICardCopilot';
import VoiceInputButton from '@/components/VoiceInputButton';

const ITEM_TYPE_LABELS = {
    pc: { label: 'Computer / Desktop', icon: '🖥️' },
    ups: { label: 'UPS / Power Backup', icon: '⚡' },
    laptop: { label: 'Laptop', icon: '💻' },
    tablet: { label: 'Tablet', icon: '📱' },
    server: { label: 'Server / Rack', icon: '🗄️' },
    interactive_panel: { label: 'Interactive Panel / IFPD', icon: '📺' },
    printer: { label: 'Printer', icon: '🖨️' },
    scanner: { label: 'Scanner', icon: '📄' },
    router: { label: 'WiFi Router', icon: '📶' },
    network_switch: { label: 'Network Switch', icon: '🌐' },
    smart_camera: { label: 'Smart Camera', icon: '📹' },
    projector: { label: 'Projector', icon: '📽️' },
    soundbar: { label: 'Soundbar', icon: '🔊' },
    speaker: { label: 'Speaker', icon: '📢' },
    headphone: { label: 'Headphones', icon: '🎧' },
    barcode_scanner: { label: 'Barcode Scanner', icon: '🏷️' },
    cable: { label: 'Cable / Accessories', icon: '🔌' },
    other: { label: 'Other Equipment', icon: '📦' }
};

const statusColors = {
    open: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-amber-100 text-amber-700',
    resolved: 'bg-emerald-100 text-emerald-700',
    closed: 'bg-slate-100 text-slate-600'
};

const priorityColors = {
    low: 'bg-slate-100 text-slate-600',
    medium: 'bg-blue-100 text-blue-700',
    high: 'bg-orange-100 text-orange-700',
    critical: 'bg-red-100 text-red-700'
};

const categoryLabels = {
    hardware_issue: '🔧 Hardware Issue',
    software_issue: '💻 Software Issue',
    maintenance_request: '🛠️ Maintenance Request',
    general_complaint: '📝 General Complaint',
    other: '📋 Other'
};

export default function TicketsPage() {
    const { user } = useAuthStore();
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [newComment, setNewComment] = useState('');
    const [labs, setLabs] = useState([]);
    const [issueTypes, setIssueTypes] = useState({});
    const [labItems, setLabItems] = useState([]);
    const [itemsLoading, setItemsLoading] = useState(false);
    const [studentProfile, setStudentProfile] = useState(null);

    // Filters
    const [statusFilter, setStatusFilter] = useState('all');
    const [priorityFilter, setPriorityFilter] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [myTicketsOnly, setMyTicketsOnly] = useState(false);

    // Create form
    const [form, setForm] = useState({
        title: '',
        description: '',
        category: 'hardware_issue',
        priority: 'medium',
        labId: '',
        itemType: '',
        itemId: '',
        issueTypeId: ''
    });

    useEffect(() => {
        loadTickets();
        loadLabs();
        loadIssueTypes();
        // Load student profile to get assigned PC
        if (user?.role === 'student') {
            loadStudentProfile();
        }
    }, [statusFilter, priorityFilter, myTicketsOnly]);

    const loadStudentProfile = async () => {
        try {
            const res = await dashboardAPI.getStudentProfile();
            setStudentProfile(res.data.data);
        } catch { }
    };

    // Load items when lab changes (for hardware/software/maintenance issues)
    useEffect(() => {
        if (form.labId && (form.category === 'hardware_issue' || form.category === 'software_issue' || form.category === 'maintenance_request')) {
            loadLabItems(form.labId);
        } else {
            setLabItems([]);
        }
    }, [form.labId, form.category]);

    const loadTickets = async () => {
        try {
            setLoading(true);
            const params = {};
            if (statusFilter !== 'all') params.status = statusFilter;
            if (priorityFilter) params.priority = priorityFilter;
            if (myTicketsOnly) params.myTickets = 'true';

            const res = await ticketsAPI.getAll(params);
            setTickets(res.data?.data?.tickets || res.data?.tickets || []);
        } catch (error) {
            toast.error('Failed to load tickets');
        } finally {
            setLoading(false);
        }
    };

    const loadLabs = async () => {
        try {
            const res = await labsAPI.getAll();
            const list = res.data?.data?.labs || res.data?.labs || (Array.isArray(res.data?.data) ? res.data.data : []);
            setLabs(Array.isArray(list) ? list : []);
        } catch { }
    };

    const loadIssueTypes = async () => {
        try {
            const res = await ticketsAPI.getIssueTypes();
            setIssueTypes(res.data?.data?.byCategory || res.data?.byCategory || {});
        } catch { }
    };

    const loadLabItems = async (labId) => {
        setItemsLoading(true);
        try {
            const res = await labsAPI.getItems(labId);
            const allItems = res.data?.data?.items || res.data?.items || (Array.isArray(res.data?.data) ? res.data.data : []);
            setLabItems(Array.isArray(allItems) ? allItems : []);
        } catch {
            setLabItems([]);
        }
        setItemsLoading(false);
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!form.title.trim() || !form.description.trim()) {
            toast.error('Title and description are required');
            return;
        }

        try {
            const data = {
                title: form.title,
                description: form.description,
                category: form.category,
                priority: form.priority
            };
            // For students, auto-use their assigned PC if available
            if (user?.role === 'student' && studentProfile?.assignedPc) {
                data.itemId = studentProfile.assignedPc.id;
                if (studentProfile.assignedPc.lab?.id) {
                    data.labId = studentProfile.assignedPc.lab.id;
                }
            } else {
                if (form.labId) data.labId = form.labId;
                if (form.itemId) data.itemId = form.itemId;
            }
            if (form.issueTypeId) data.issueTypeId = form.issueTypeId;

            const res = await ticketsAPI.create(data);
            const tNumber = res.data?.data?.ticket?.ticketNumber || res.data?.ticket?.ticketNumber || 'CREATED';
            toast.success(`Ticket ${tNumber} created successfully!`);
            setShowCreateModal(false);
            setForm({ title: '', description: '', category: 'hardware_issue', priority: 'medium', labId: '', itemType: '', itemId: '', issueTypeId: '' });
            loadTickets();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to create ticket');
        }
    };

    const openDetail = async (ticket) => {
        setSelectedTicket(ticket);
        setShowDetailModal(true);
        setDetailLoading(true);
        try {
            const res = await ticketsAPI.getById(ticket.id);
            setSelectedTicket(res.data.data.ticket);
        } catch (error) {
            toast.error('Failed to load ticket details');
        } finally {
            setDetailLoading(false);
        }
    };

    const handleAddComment = async () => {
        if (!newComment.trim()) return;
        try {
            await ticketsAPI.addComment(selectedTicket.id, newComment);
            toast.success('Comment added');
            setNewComment('');
            // Reload ticket detail
            const res = await ticketsAPI.getById(selectedTicket.id);
            setSelectedTicket(res.data.data.ticket);
        } catch (error) {
            toast.error('Failed to add comment');
        }
    };

    const handleStatusChange = async (ticketId, newStatus) => {
        try {
            if (newStatus === 'resolved') {
                await ticketsAPI.resolve(ticketId, '');
            } else if (newStatus === 'closed') {
                await ticketsAPI.close(ticketId);
            } else {
                await ticketsAPI.update(ticketId, { status: newStatus });
            }
            toast.success('Status updated');
            loadTickets();
            if (selectedTicket?.id === ticketId) {
                const res = await ticketsAPI.getById(ticketId);
                setSelectedTicket(res.data.data.ticket);
            }
        } catch (error) {
            toast.error('Failed to update status');
        }
    };

    const filteredTickets = tickets.filter(t =>
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const isAdmin = ['admin', 'principal', 'lab_assistant'].includes(user?.role);

    return (
        <div className="min-h-screen bg-slate-50 pb-8">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-20 mb-6">
                <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
                            <Ticket className="w-5 h-5 text-primary-600" />
                        </div>
                        <div>
                            <h1 className="text-lg font-semibold text-slate-900">Support Tickets</h1>
                            <p className="text-sm text-slate-500">Report issues, request maintenance, or submit complaints</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="p-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl transition shadow-sm"
                        title="Create Ticket"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4">

                {/* Filters */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search tickets..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            />
                        </div>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                        >
                            <option value="all">All Status</option>
                            <option value="open">Open</option>
                            <option value="in_progress">In Progress</option>
                            <option value="resolved">Resolved</option>
                            <option value="closed">Closed</option>
                        </select>
                        <select
                            value={priorityFilter}
                            onChange={(e) => setPriorityFilter(e.target.value)}
                            className="px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                        >
                            <option value="">All Priority</option>
                            <option value="critical">Critical</option>
                            <option value="high">High</option>
                            <option value="medium">Medium</option>
                            <option value="low">Low</option>
                        </select>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={myTicketsOnly}
                                onChange={(e) => setMyTicketsOnly(e.target.checked)}
                                className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                            />
                            <span className="text-sm text-slate-600">My tickets only</span>
                        </label>
                    </div>
                </div>

                {/* Tickets List */}
                {loading ? (
                    <div className="text-center py-12">
                        <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto"></div>
                        <p className="mt-2 text-slate-500">Loading tickets...</p>
                    </div>
                ) : filteredTickets.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
                        <Ticket className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500">No tickets found</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredTickets.map((ticket) => (
                            <div
                                key={ticket.id}
                                onClick={() => openDetail(ticket)}
                                className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition cursor-pointer"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-xs font-mono text-slate-400">{ticket.ticketNumber}</span>
                                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[ticket.status]}`}>
                                                {ticket.status.replace('_', ' ').toUpperCase()}
                                            </span>
                                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${priorityColors[ticket.priority]}`}>
                                                {ticket.priority.toUpperCase()}
                                            </span>
                                        </div>
                                        <h3 className="font-semibold text-slate-800 mb-1">{ticket.title}</h3>
                                        <p className="text-sm text-slate-500 line-clamp-1">{ticket.description}</p>
                                        <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-500">
                                            <span className="flex items-center gap-1">
                                                <User size={14} />
                                                {ticket.createdBy?.firstName} {ticket.createdBy?.lastName}
                                            </span>
                                            {ticket.lab && (
                                                <span className="flex items-center gap-1">
                                                    <Building2 size={14} />
                                                    {ticket.lab.name} {ticket.lab.roomNumber ? `(${ticket.lab.roomNumber})` : ''}
                                                </span>
                                            )}
                                            {ticket.item && (
                                                <span className="flex items-center gap-1.5 font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded text-slate-700 border border-slate-200">
                                                    <span>{ITEM_TYPE_LABELS[ticket.item.itemType]?.icon || '📦'} {ticket.item.itemNumber}</span>
                                                    {ticket.item.serialNo && (
                                                        <span className="text-slate-500 font-semibold">• SN: {ticket.item.serialNo}</span>
                                                    )}
                                                </span>
                                            )}
                                            <span className="flex items-center gap-1">
                                                <Clock size={14} />
                                                {formatDate(ticket.createdAt)}
                                            </span>
                                            {ticket._count?.comments > 0 && (
                                                <span className="flex items-center gap-1">
                                                    <MessageSquare size={14} />
                                                    {ticket._count.comments}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <ChevronRight className="text-slate-400" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Create Ticket Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-4 border-b">
                            <h2 className="text-xl font-bold">Create New Ticket</h2>
                            <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleCreate} className="p-4 space-y-4">
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="block text-sm font-medium text-slate-700">Title *</label>
                                    <VoiceInputButton
                                        onTranscript={(text) => setForm(p => ({ ...p, title: (p.title ? `${p.title} ${text}` : text).trim() }))}
                                    />
                                </div>
                                <input
                                    type="text"
                                    value={form.title}
                                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                                    placeholder="Brief summary of the issue"
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                                    required
                                />
                            </div>
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="block text-sm font-medium text-slate-700">Description *</label>
                                    <VoiceInputButton
                                        onTranscript={(text) => setForm(p => ({ ...p, description: (p.description ? `${p.description} ${text}` : text).trim() }))}
                                    />
                                </div>
                                <textarea
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    placeholder="Detailed description of the issue..."
                                    rows={3}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                                    required
                                />
                            </div>

                            {/* Category and Priority */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Category *</label>
                                    <select
                                        value={form.category}
                                        onChange={(e) => setForm({ ...form, category: e.target.value, issueTypeId: '', itemId: '' })}
                                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                                    >
                                        <option value="hardware_issue">🔧 Hardware Issue</option>
                                        <option value="software_issue">💻 Software Issue</option>
                                        <option value="maintenance_request">🛠️ Maintenance Request</option>
                                        <option value="general_complaint">📝 General Complaint</option>
                                        <option value="other">📋 Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
                                    <select
                                        value={form.priority}
                                        onChange={(e) => setForm({ ...form, priority: e.target.value })}
                                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                                    >
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                        <option value="critical">Critical</option>
                                    </select>
                                </div>
                            </div>

                            {/* Issue Type - Dynamic based on category */}
                            {issueTypes[form.category]?.length > 0 && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Issue Type *</label>
                                    <select
                                        value={form.issueTypeId}
                                        onChange={(e) => {
                                            const selected = issueTypes[form.category]?.find(t => t.id === e.target.value);
                                            setForm({
                                                ...form,
                                                issueTypeId: e.target.value,
                                                title: selected ? selected.name : form.title
                                            });
                                        }}
                                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                                    >
                                        <option value="">Select issue type...</option>
                                        {issueTypes[form.category]?.map(type => (
                                            <option key={type.id} value={type.id}>{type.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Lab, Item Type & Serial No. Selection */}
                            {user?.role !== 'student' && (form.category === 'hardware_issue' || form.category === 'software_issue' || form.category === 'maintenance_request') && (
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                            Lab Location {(form.category === 'hardware_issue' || form.category === 'software_issue') ? '*' : '(Optional)'}
                                        </label>
                                        <select
                                            value={form.labId}
                                            onChange={(e) => setForm({ ...form, labId: e.target.value, itemType: '', itemId: '' })}
                                            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                                        >
                                            <option value="">Select a lab...</option>
                                            {labs.map(lab => (
                                                <option key={lab.id} value={lab.id}>{lab.name} {lab.roomNumber ? `(Room ${lab.roomNumber})` : ''}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Item Type & Serial No. selectors (Active when Lab is chosen) */}
                                    {form.labId && (
                                        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                {/* 1. Item Type Selector */}
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                                        Filter by Equipment / Item Type
                                                    </label>
                                                    <select
                                                        value={form.itemType}
                                                        onChange={(e) => setForm({ ...form, itemType: e.target.value, itemId: '' })}
                                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-primary-500"
                                                    >
                                                        <option value="">All Item Types ({labItems.length} items)</option>
                                                        {Array.from(new Set(labItems.map(i => i.itemType))).filter(Boolean).map(type => (
                                                            <option key={type} value={type}>
                                                                {ITEM_TYPE_LABELS[type]?.icon || '📦'} {ITEM_TYPE_LABELS[type]?.label || type} ({labItems.filter(i => i.itemType === type).length})
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>

                                                {/* 2. Serial No. / Item Selector */}
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                                        Serial Number & Hardware Item *
                                                    </label>
                                                    {itemsLoading ? (
                                                        <div className="text-xs text-slate-500 py-2">Loading items...</div>
                                                    ) : labItems.length === 0 ? (
                                                        <div className="text-xs text-amber-600 py-2">No items found in this lab</div>
                                                    ) : (
                                                        <select
                                                            value={form.itemId}
                                                            onChange={(e) => {
                                                                const selected = labItems.find(i => i.id === e.target.value);
                                                                setForm({
                                                                    ...form,
                                                                    itemId: e.target.value,
                                                                    itemType: selected ? selected.itemType : form.itemType
                                                                });
                                                            }}
                                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-primary-500 font-mono"
                                                        >
                                                            <option value="">-- Select by Serial No. / Item ID --</option>
                                                            {labItems
                                                                .filter(item => !form.itemType || form.itemType === 'all' || item.itemType === form.itemType)
                                                                .map(item => (
                                                                    <option key={item.id} value={item.id}>
                                                                        {item.itemNumber} • SN: {item.serialNo || 'N/A'}{item.brand ? ` (${item.brand} ${item.modelNo || ''})` : ''}
                                                                    </option>
                                                                ))}
                                                        </select>
                                                    )}
                                                </div>
                                            </div>

                                            {/* 3. Selected Item Preview Card */}
                                            {form.itemId && (() => {
                                                const sel = labItems.find(i => i.id === form.itemId);
                                                if (!sel) return null;
                                                return (
                                                    <div className="p-3 bg-white rounded-lg border border-primary-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs animate-in fade-in">
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-2 font-semibold text-slate-900">
                                                                <span>{ITEM_TYPE_LABELS[sel.itemType]?.icon || '📦'} {sel.itemNumber}</span>
                                                                <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] uppercase font-bold">
                                                                    {sel.itemType}
                                                                </span>
                                                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${sel.status === 'faulty' ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
                                                                    {sel.status}
                                                                </span>
                                                            </div>
                                                            <div className="text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px]">
                                                                <span>Brand: <strong>{sel.brand || 'Standard'}</strong> {sel.modelNo || ''}</span>
                                                                {sel.specs?.linked_desktop_item_number && (
                                                                    <span>Linked PC: <strong>{sel.specs.linked_desktop_item_number}</strong></span>
                                                                )}
                                                                {sel.specs?.linked_ups_item_number && (
                                                                    <span>Linked UPS: <strong>{sel.specs.linked_ups_item_number}</strong></span>
                                                                )}
                                                                {sel.specs?.capacity && (
                                                                    <span>Capacity: <strong>{sel.specs.capacity}</strong></span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2 self-start sm:self-center bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200">
                                                            <span className="text-[10px] text-slate-400 font-bold uppercase">Serial No:</span>
                                                            <span className="font-mono font-bold text-slate-800 text-xs select-all">
                                                                {sel.serialNo || 'N/A'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Show assigned PC info for students */}
                            {user?.role === 'student' && (form.category === 'hardware_issue' || form.category === 'software_issue') && (
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                    <p className="text-sm font-medium text-blue-700 mb-1">Your Assigned System</p>
                                    {studentProfile?.assignedPc ? (
                                        <p className="text-blue-800">
                                            {studentProfile.assignedPc.itemType} - {studentProfile.assignedPc.itemNumber}
                                            {studentProfile.assignedPc.brand && ` (${studentProfile.assignedPc.brand})`}
                                            {studentProfile.assignedPc.lab && ` • ${studentProfile.assignedPc.lab.name}`}
                                        </p>
                                    ) : (
                                        <p className="text-blue-600 text-sm">No PC assigned. Your ticket will be submitted without a specific system reference.</p>
                                    )}
                                </div>
                            )}

                            <div className="flex justify-end gap-2 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="p-3 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition"
                                    title="Cancel"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                                <button
                                    type="submit"
                                    className="p-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl transition shadow-sm"
                                    title="Create Ticket"
                                >
                                    <CheckCircle2 className="w-5 h-5" />
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Ticket Detail Modal */}
            {showDetailModal && selectedTicket && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
                            <div>
                                <span className="text-sm font-mono text-slate-400">{selectedTicket.ticketNumber}</span>
                                <h2 className="text-xl font-bold">{selectedTicket.title}</h2>
                            </div>
                            <button onClick={() => setShowDetailModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={24} />
                            </button>
                        </div>

                        {detailLoading ? (
                            <div className="p-8 text-center">
                                <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto"></div>
                            </div>
                        ) : (
                            <div className="p-4 space-y-4">
                                {/* Status and Actions */}
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[selectedTicket.status]}`}>
                                        {selectedTicket.status.replace('_', ' ').toUpperCase()}
                                    </span>
                                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${priorityColors[selectedTicket.priority]}`}>
                                        {selectedTicket.priority.toUpperCase()}
                                    </span>
                                    <span className="px-3 py-1 bg-slate-100 rounded-full text-sm">
                                        {categoryLabels[selectedTicket.category]}
                                    </span>
                                    {isAdmin && selectedTicket.status !== 'closed' && (
                                        <select
                                            value={selectedTicket.status}
                                            onChange={(e) => handleStatusChange(selectedTicket.id, e.target.value)}
                                            className="ml-auto px-3 py-1 border rounded-lg text-sm"
                                        >
                                            <option value="open">Open</option>
                                            <option value="in_progress">In Progress</option>
                                            <option value="resolved">Resolved</option>
                                            <option value="closed">Closed</option>
                                        </select>
                                    )}
                                </div>

                                {/* Description */}
                                <div className="bg-slate-50 rounded-lg p-4">
                                    <p className="text-slate-700 whitespace-pre-wrap">{selectedTicket.description}</p>
                                </div>

                                {/* Meta Info */}
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                                    <div>
                                        <p className="text-slate-400">Created by</p>
                                        <p className="font-medium">{selectedTicket.createdBy?.firstName} {selectedTicket.createdBy?.lastName}</p>
                                    </div>
                                    <div>
                                        <p className="text-slate-400">Created</p>
                                        <p className="font-medium">{formatDateTime(selectedTicket.createdAt)}</p>
                                    </div>
                                    {selectedTicket.lab && (
                                        <div>
                                            <p className="text-slate-400">Lab Location</p>
                                            <p className="font-medium">{selectedTicket.lab.name} {selectedTicket.lab.roomNumber ? `(${selectedTicket.lab.roomNumber})` : ''}</p>
                                        </div>
                                    )}
                                    {selectedTicket.item && (
                                        <div className="col-span-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                                            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Affected Hardware Equipment</p>
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-base">{ITEM_TYPE_LABELS[selectedTicket.item.itemType]?.icon || '📦'}</span>
                                                    <div>
                                                        <p className="font-bold text-slate-800 text-xs">{selectedTicket.item.itemNumber} ({ITEM_TYPE_LABELS[selectedTicket.item.itemType]?.label || selectedTicket.item.itemType})</p>
                                                        <p className="text-slate-500 text-[11px]">{selectedTicket.item.brand || ''} {selectedTicket.item.modelNo || ''}</p>
                                                    </div>
                                                </div>
                                                {selectedTicket.item.serialNo && (
                                                    <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded border border-slate-200">
                                                        <span className="text-[10px] text-slate-400 font-bold uppercase">Serial:</span>
                                                        <span className="font-mono text-slate-800 text-xs font-bold">{selectedTicket.item.serialNo}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                    {selectedTicket.assignedTo && (
                                        <div>
                                            <p className="text-slate-400">Assigned to</p>
                                            <p className="font-medium">{selectedTicket.assignedTo.firstName} {selectedTicket.assignedTo.lastName}</p>
                                        </div>
                                    )}
                                    {selectedTicket.resolvedBy && (
                                        <div>
                                            <p className="text-slate-400">Resolved by</p>
                                            <p className="font-medium">{selectedTicket.resolvedBy.firstName} {selectedTicket.resolvedBy.lastName}</p>
                                        </div>
                                    )}
                                </div>

                                {selectedTicket.resolutionNotes && (
                                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                                        <p className="text-sm font-medium text-emerald-700 mb-1">Resolution Notes</p>
                                        <p className="text-emerald-800">{selectedTicket.resolutionNotes}</p>
                                    </div>
                                )}

                                {/* Comments */}
                                <div>
                                    {/* AI Ticket Resolution Copilot */}
                                    {selectedTicket.status !== 'closed' && (
                                        <AICardCopilot
                                            type="ticket_reply"
                                            context={{
                                                ticketNumber: selectedTicket.ticketNumber,
                                                title: selectedTicket.title,
                                                description: selectedTicket.description,
                                                category: selectedTicket.category,
                                                priority: selectedTicket.priority,
                                                labName: selectedTicket.lab?.name,
                                                itemName: selectedTicket.item?.itemType ? `${selectedTicket.item.itemType} - ${selectedTicket.item.itemNumber}` : undefined,
                                                userName: `${selectedTicket.user?.firstName || ''} ${selectedTicket.user?.lastName || ''}`.trim()
                                            }}
                                            onInsert={(aiData) => {
                                                if (aiData?.draftReply) {
                                                    setNewComment(aiData.draftReply);
                                                }
                                            }}
                                        />
                                    )}

                                    <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                                        <MessageSquare size={18} />
                                        Comments ({selectedTicket.comments?.length || 0})
                                    </h3>
                                    <div className="space-y-3 max-h-60 overflow-y-auto">
                                        {selectedTicket.comments?.map(comment => (
                                            <div key={comment.id} className="bg-slate-50 rounded-lg p-3">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="font-medium text-sm">
                                                        {comment.user?.firstName} {comment.user?.lastName}
                                                        <span className="ml-2 text-xs px-1.5 py-0.5 bg-slate-200 rounded">
                                                            {comment.user?.role}
                                                        </span>
                                                    </span>
                                                    <span className="text-xs text-slate-400">
                                                        {formatDateTime(comment.createdAt)}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-slate-700">{comment.content}</p>
                                            </div>
                                        ))}
                                        {(!selectedTicket.comments || selectedTicket.comments.length === 0) && (
                                            <p className="text-sm text-slate-400 italic">No comments yet</p>
                                        )}
                                    </div>

                                    {/* Add Comment */}
                                    {selectedTicket.status !== 'closed' && (
                                        <div className="flex gap-2 mt-3 items-center">
                                            <input
                                                type="text"
                                                value={newComment}
                                                onChange={(e) => setNewComment(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                                                placeholder="Add a comment or paste AI reply..."
                                                className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                                            />
                                            <VoiceInputButton
                                                onTranscript={(text) => setNewComment(p => (p ? `${p} ${text}` : text).trim())}
                                            />
                                            <button
                                                onClick={handleAddComment}
                                                disabled={!newComment.trim()}
                                                className="p-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                                                title="Send"
                                            >
                                                <Send size={18} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
