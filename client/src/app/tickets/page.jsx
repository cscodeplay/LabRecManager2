'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ticketsAPI, labsAPI, dashboardAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { toast } from 'react-hot-toast';
import { formatDate, formatDateTime, formatRelativeTime } from '@/lib/dateUtils';
import {
    Ticket, Plus, Filter, Search, Clock, CheckCircle2, AlertCircle,
    MessageSquare, User, Monitor, Building2, ChevronRight, X, Send,
    Zap, Laptop, Server, Tv, Printer, Radio, Wifi, Copy, Check,
    Calendar, Lock, LayoutGrid, List, CheckSquare, Square,
    ChevronDown, ChevronUp, Tag, Edit3, Eye, Trash2
} from 'lucide-react';
import VoiceInputButton from '@/components/VoiceInputButton';
import LabInfrastructureTabs from '@/components/LabInfrastructureTabs';
import GreenSegmentedSpinner from '@/components/GreenSegmentedSpinner';

const COMMON_DEVICE_ISSUES = {
    interactive_panel: [
        'Touch Sensor Unresponsive / Dead Spots',
        'OPS Windows Module Not Booting',
        'Display Blank / Flickering / HDMI Cable Fault',
        'Stylus / Digital Pen Not Writing or Drawing',
        'Built-in Speaker Audio Distortion or No Sound',
        'Panel WiFi / LAN Disconnection',
        'Whiteboard Application Freezing'
    ],
    pc: [
        'No Display / Power LED On but Blank Screen',
        'Blue Screen of Death (BSOD) / Boot Loop',
        'RAM / Storage (SSD/HDD) Fault Alert',
        'Keyboard or Mouse Unresponsive / USB Port Fault',
        'Extreme System Lag / OS Freezing',
        'LAN Cable Disconnected / No Internet'
    ],
    ups: [
        'Continuous Beeping / Overload Alert',
        'Battery Backup Depleted (< 2 mins runtime)',
        'Output Sockets Not Supplying Power',
        'Mains Input Fuse Blown / Not Charging'
    ],
    smart_camera: [
        'Camera Not Detected by System',
        'Blurry / Fuzzy Video Stream',
        'Microphone Static Noise / No Audio Pickup',
        'Wireless Mic Pairing Failure'
    ],
    projector: [
        'Lamp Life Exhausted / Dim Projection',
        'Overheating Warning / Auto Shutdown',
        'Keystone Distortion / Focus Jammed',
        'HDMI Port Loose / No Signal'
    ],
    tablet: [
        'Touch Screen Cracked / Multi-Touch Glitch',
        'Battery Swelling / Fast Drain',
        'Charging Port Loose / Not Charging',
        'Active Stylus Disconnected / Tip Damaged'
    ],
    printer: [
        'Paper Jam in Roller Assembly',
        'Toner / Ink Smudging / Low Cartridge',
        'Network Print Spooler Stuck'
    ],
    other: [
        'Hardware Power Failure',
        'Cable / Port Physical Damage',
        'Device Not Powering On',
        'Frequent Disconnections'
    ]
};

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
    const router = useRouter();
    const { user, isAuthenticated, _hasHydrated, selectedSessionId, selectedSession, isReadOnlyMode } = useAuthStore();
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

    // View mode: 'grid' vs 'list'
    const [ticketViewMode, setTicketViewMode] = useState('grid'); // 'grid' | 'list'

    // Multi-device and search state
    const [allSchoolItems, setAllSchoolItems] = useState([]);
    const [selectedDevices, setSelectedDevices] = useState([]);
    const [deviceSearchTerm, setDeviceSearchTerm] = useState('');
    const [deviceDropdownOpen, setDeviceDropdownOpen] = useState(false);
    const [selectedCommonIssues, setSelectedCommonIssues] = useState(new Set());
    const [customVariety, setCustomVariety] = useState({ type: 'Remote Control', note: '' });
    const [showVarietySection, setShowVarietySection] = useState(false);
    const [editingTicketId, setEditingTicketId] = useState(null);

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
        if (!_hasHydrated) return;
        if (!isAuthenticated) {
            router.push('/login');
            return;
        }
        loadTickets();
        loadLabs();
        loadIssueTypes();
        loadAllSchoolItems();
        // Load student profile to get assigned PC
        if (user?.role === 'student') {
            loadStudentProfile();
        }
    }, [_hasHydrated, isAuthenticated, statusFilter, priorityFilter, myTicketsOnly]);

    const loadAllSchoolItems = async () => {
        try {
            const res = await labsAPI.listAllItems();
            const items = res.data?.data || (Array.isArray(res.data) ? res.data : []);
            setAllSchoolItems(Array.isArray(items) ? items : []);
        } catch {
            setAllSchoolItems([]);
        }
    };

    const toggleCommonIssue = (issueText) => {
        setSelectedCommonIssues(prev => {
            const next = new Set(prev);
            if (next.has(issueText)) {
                next.delete(issueText);
                setForm(f => ({
                    ...f,
                    description: f.description.replace(`\n• ${issueText}`, '').replace(`• ${issueText}\n`, '').replace(`• ${issueText}`, '').trim()
                }));
            } else {
                next.add(issueText);
                setForm(f => ({
                    ...f,
                    title: f.title ? f.title : issueText,
                    description: f.description ? `${f.description}\n• ${issueText}` : `• ${issueText}`
                }));
            }
            return next;
        });
    };

    const toggleSelectDevice = (item) => {
        setSelectedDevices(prev => {
            const exists = prev.some(d => d.id === item.id);
            const next = exists ? prev.filter(d => d.id !== item.id) : [...prev, item];
            const primary = next[0];
            setForm(f => ({
                ...f,
                itemId: primary ? primary.id : '',
                itemType: primary ? primary.itemType : f.itemType,
                labId: primary?.lab?.id || primary?.labId || f.labId
            }));
            return next;
        });
    };

    const handleAddVariety = () => {
        if (!customVariety.note.trim()) {
            toast.error('Please enter a note for the component fault');
            return;
        }
        const varietyText = `[${customVariety.type}]: ${customVariety.note.trim()}`;
        setForm(f => ({
            ...f,
            description: f.description ? `${f.description}\n• ${varietyText}` : `• ${varietyText}`
        }));
        setCustomVariety({ type: customVariety.type || 'Remote Control', note: '' });
        toast.success('Variety added to issue details');
    };

        const handleOpenEdit = (ticket) => {
        setEditingTicketId(ticket.id);
        setForm({
            title: ticket.title || '',
            description: ticket.description || '',
            category: ticket.category || 'hardware_issue',
            priority: ticket.priority || 'medium',
            labId: ticket.lab?.id || ticket.labId || '',
            itemType: ticket.item?.itemType || '',
            itemId: ticket.item?.id || ticket.itemId || '',
            issueTypeId: ticket.issueTypeId || ''
        });
        if (ticket.item) {
            setSelectedDevices([ticket.item]);
        } else {
            setSelectedDevices([]);
        }
        setSelectedCommonIssues(new Set());
        setDeviceSearchTerm('');
        setShowVarietySection(false);
        setShowDetailModal(false);
        setShowCreateModal(true);
    };

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
            const params = { all: 'true' };
            if (statusFilter !== 'all') params.status = statusFilter;
            if (priorityFilter) params.priority = priorityFilter;
            if (myTicketsOnly) params.myTickets = 'true';

            const res = await ticketsAPI.getAll(params);
            const ticketList = res.data?.data?.tickets || res.data?.tickets || (Array.isArray(res.data?.data) ? res.data.data : []);
            setTickets(Array.isArray(ticketList) ? ticketList : []);
        } catch (error) {
            console.error('Error loading tickets:', error);
            toast.error(error.response?.data?.message || 'Failed to load tickets');
            setTickets([]);
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

        if (isReadOnlyMode) {
            toast.error('Cannot create tickets in historical / read-only session mode');
            return;
        }

        try {
            let finalDescription = form.description.trim();
            if (selectedDevices.length > 0) {
                const devStrings = selectedDevices.map(d => `${d.itemNumber} (SN: ${d.serialNo || 'N/A'}, ${d.brand || ''} ${d.modelNo || ''})`).join(', ');
                if (!finalDescription.includes('Device(s):')) {
                    finalDescription = `${finalDescription}\n\nDevice(s): ${devStrings}`;
                }
            }

            const data = {
                title: form.title.trim(),
                description: finalDescription,
                category: form.category || 'other',
                priority: form.priority || 'medium',
                academicYearId: (selectedSessionId && selectedSessionId !== 'all') ? selectedSessionId : undefined
            };
            // For students, auto-use their assigned PC if available
            if (user?.role === 'student' && studentProfile?.assignedPc) {
                if (studentProfile.assignedPc.id) data.itemId = studentProfile.assignedPc.id;
                if (studentProfile.assignedPc.lab?.id) {
                    data.labId = studentProfile.assignedPc.lab.id;
                }
            } else {
                if (form.labId && form.labId.trim()) data.labId = form.labId.trim();
                if (form.itemId && form.itemId.trim()) data.itemId = form.itemId.trim();
            }
            if (form.issueTypeId && form.issueTypeId.trim()) data.issueTypeId = form.issueTypeId.trim();

            if (editingTicketId) {
                await ticketsAPI.update(editingTicketId, data);
                toast.success('Ticket updated successfully!');
            } else {
                const res = await ticketsAPI.create(data);
                const tNumber = res.data?.data?.ticket?.ticketNumber || res.data?.ticket?.ticketNumber || 'CREATED';
                toast.success(`Ticket ${tNumber} created successfully!`);
            }
            setShowCreateModal(false);
            setEditingTicketId(null);
            setForm({ title: '', description: '', category: 'hardware_issue', priority: 'medium', labId: '', itemType: '', itemId: '', issueTypeId: '' });
            setSelectedDevices([]);
            setSelectedCommonIssues(new Set());
            setDeviceSearchTerm('');
            setCustomVariety({ type: 'Remote Control', note: '' });
            setShowVarietySection(false);
            loadTickets();
        } catch (error) {
            const msg = error.response?.data?.message || (error.response?.data?.errors && error.response.data.errors[0]?.msg) || error.message || 'Failed to create ticket';
            toast.error(msg);
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

    const filteredTickets = tickets.filter(t => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
            t.title?.toLowerCase().includes(q) ||
            t.ticketNumber?.toLowerCase().includes(q) ||
            t.description?.toLowerCase().includes(q) ||
            t.item?.itemNumber?.toLowerCase().includes(q) ||
            t.item?.serialNo?.toLowerCase().includes(q) ||
            t.lab?.name?.toLowerCase().includes(q) ||
            `${t.createdBy?.firstName || ''} ${t.createdBy?.lastName || ''}`.toLowerCase().includes(q)
        );
    });

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
                </div>
            </div>
            <LabInfrastructureTabs activeTab="tickets" className="mb-4 -mt-6" />

            <div className="max-w-7xl mx-auto px-4">
                {/* Actions Row below Tab Bar (Right-most Create Ticket Icon) */}
                <div className="flex items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            All Tickets ({filteredTickets.length})
                        </div>
                        {/* View Switcher: Grid vs List */}
                        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                            <button
                                type="button"
                                onClick={() => setTicketViewMode('grid')}
                                className={`p-1.5 rounded-md transition-colors ${
                                    ticketViewMode === 'grid'
                                        ? 'bg-white text-primary-600 shadow-xs font-bold'
                                        : 'text-slate-500 hover:text-slate-900'
                                }`}
                                title="Grid View (Cards)"
                                aria-label="Grid View"
                            >
                                <LayoutGrid className="w-4 h-4" />
                            </button>
                            <button
                                type="button"
                                onClick={() => setTicketViewMode('list')}
                                className={`p-1.5 rounded-md transition-colors ${
                                    ticketViewMode === 'list'
                                        ? 'bg-white text-primary-600 shadow-xs font-bold'
                                        : 'text-slate-500 hover:text-slate-900'
                                }`}
                                title="List View (Table)"
                                aria-label="List View"
                            >
                                <List className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            if (isReadOnlyMode) {
                                toast.error('Cannot create tickets in historical / read-only session mode');
                                return;
                            }
                            setEditingTicketId(null);
                            setForm({ title: '', description: '', category: 'hardware_issue', priority: 'medium', labId: '', itemType: '', itemId: '', issueTypeId: '' });
                            setSelectedDevices([]);
                            setSelectedCommonIssues(new Set());
                            setDeviceSearchTerm('');
                            setShowVarietySection(false);
                            setShowCreateModal(true);
                        }}
                        className={`p-2.5 px-4 rounded-xl transition shadow-xs flex items-center gap-2 font-medium text-sm ${isReadOnlyMode ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-primary-600 hover:bg-primary-700 text-white'}`}
                        title={isReadOnlyMode ? 'Tickets are locked in historical session' : 'Create Ticket'}
                    >
                        <Plus className="w-5 h-5" />
                        <span>Create Ticket</span>
                    </button>
                </div>

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
                    <div className="text-center py-16 flex flex-col items-center justify-center">
                        <GreenSegmentedSpinner size="lg" label="Loading tickets..." />
                    </div>
                ) : filteredTickets.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
                        <Ticket className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500">No tickets found</p>
                    </div>
                ) : ticketViewMode === 'list' ? (
                    /* Table / Column View */
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                                    <tr>
                                        <th className="py-3 px-4">Ticket #</th>
                                        <th className="py-3 px-4">Status & Priority</th>
                                        <th className="py-3 px-4">Title & Issue</th>
                                        <th className="py-3 px-4">Location / Lab</th>
                                        <th className="py-3 px-4">Hardware & S/N</th>
                                        <th className="py-3 px-4">Session</th>
                                        <th className="py-3 px-4">Reported By</th>
                                        <th className="py-3 px-4">Date</th>
                                        <th className="py-3 px-4 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredTickets.map(ticket => (
                                        <tr
                                            key={ticket.id}
                                            onClick={() => openDetail(ticket)}
                                            className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                                        >
                                            <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                                                {ticket.ticketNumber}
                                            </td>
                                            <td className="py-3 px-4 whitespace-nowrap">
                                                <div className="flex items-center gap-1.5">
                                                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${statusColors[ticket.status]}`}>
                                                        {ticket.status.replace('_', ' ').toUpperCase()}
                                                    </span>
                                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${priorityColors[ticket.priority]}`}>
                                                        {ticket.priority.toUpperCase()}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 max-w-xs">
                                                <div className="font-semibold text-slate-900 line-clamp-1">{ticket.title}</div>
                                                <div className="text-slate-500 text-[11px] line-clamp-1">{ticket.description}</div>
                                            </td>
                                            <td className="py-3 px-4 whitespace-nowrap">
                                                {ticket.lab ? (
                                                    <span className="flex items-center gap-1 text-slate-700">
                                                        <Building2 size={13} className="text-slate-400 shrink-0" />
                                                        <span>{ticket.lab.name} {ticket.lab.roomNumber ? `(${ticket.lab.roomNumber})` : ''}</span>
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400 italic">—</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 whitespace-nowrap">
                                                {ticket.item ? (
                                                    <div className="flex items-center gap-1.5 font-mono text-[11px] bg-slate-50 px-2 py-1 rounded border border-slate-200">
                                                        <span>{ITEM_TYPE_LABELS[ticket.item.itemType]?.icon || '📦'} {ticket.item.itemNumber}</span>
                                                        {ticket.item.serialNo && (
                                                            <span className="text-primary-700 font-bold">• S/N: {ticket.item.serialNo}</span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400 italic">—</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 whitespace-nowrap">
                                                {ticket.academicYear ? (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-primary-700 bg-primary-50 px-2 py-0.5 rounded border border-primary-200">
                                                        <Calendar size={11} />
                                                        {ticket.academicYear.yearLabel}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400 italic">—</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 whitespace-nowrap text-slate-600">
                                                <span className="flex items-center gap-1">
                                                    <User size={13} className="text-slate-400 shrink-0" />
                                                    <span>{ticket.createdBy?.firstName} {ticket.createdBy?.lastName}</span>
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                                                {formatDate(ticket.createdAt)}
                                            </td>
                                            <td className="py-3 px-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex items-center justify-center gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => openDetail(ticket)}
                                                        className="p-1.5 text-slate-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition"
                                                        title="View Ticket Details"
                                                    >
                                                        <Eye size={15} />
                                                    </button>
                                                    {isAdmin && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleOpenEdit(ticket)}
                                                            className="p-1.5 text-slate-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition"
                                                            title="Edit Ticket"
                                                        >
                                                            <Edit3 size={15} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    /* Grid / Cards View */
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredTickets.map((ticket) => (
                            <div
                                key={ticket.id}
                                onClick={() => openDetail(ticket)}
                                className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition cursor-pointer flex flex-col justify-between"
                            >
                                <div>
                                    <div className="flex items-center justify-between gap-2 mb-2">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className="text-xs font-mono font-bold text-slate-500">{ticket.ticketNumber}</span>
                                            <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${statusColors[ticket.status]}`}>
                                                {ticket.status.replace('_', ' ').toUpperCase()}
                                            </span>
                                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${priorityColors[ticket.priority]}`}>
                                                {ticket.priority.toUpperCase()}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                type="button"
                                                onClick={() => openDetail(ticket)}
                                                className="p-1 text-slate-400 hover:text-primary-600 rounded"
                                                title="View Details"
                                            >
                                                <Eye size={15} />
                                            </button>
                                            {isAdmin && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenEdit(ticket)}
                                                    className="p-1 text-slate-400 hover:text-primary-600 rounded"
                                                    title="Edit Ticket"
                                                >
                                                    <Edit3 size={15} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <h3 className="font-semibold text-slate-800 mb-1">{ticket.title}</h3>
                                    <p className="text-xs text-slate-500 line-clamp-2 mb-3">{ticket.description}</p>
                                </div>

                                <div className="space-y-2 pt-2 border-t border-slate-100">
                                    {ticket.item && (
                                        <div className="flex items-center gap-1.5 font-mono text-[11px] bg-slate-50 px-2 py-1 rounded border border-slate-200 text-slate-700">
                                            <span>{ITEM_TYPE_LABELS[ticket.item.itemType]?.icon || '📦'} {ticket.item.itemNumber}</span>
                                            {ticket.item.serialNo && (
                                                <span className="text-primary-700 font-bold">• SN: {ticket.item.serialNo}</span>
                                            )}
                                        </div>
                                    )}
                                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                                        <span className="flex items-center gap-1">
                                            <User size={13} className="text-slate-400" />
                                            <span>{ticket.createdBy?.firstName} {ticket.createdBy?.lastName}</span>
                                        </span>
                                        {ticket.lab && (
                                            <span className="flex items-center gap-1">
                                                <Building2 size={13} className="text-slate-400" />
                                                <span>{ticket.lab.name}</span>
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400">
                                        <span className="flex items-center gap-1">
                                            <Clock size={12} />
                                            {formatDate(ticket.createdAt)}
                                        </span>
                                        {ticket.academicYear && (
                                            <span className="flex items-center gap-1 text-primary-700 font-medium">
                                                <Calendar size={11} />
                                                {ticket.academicYear.yearLabel}
                                            </span>
                                        )}
                                        {ticket._count?.comments > 0 && (
                                            <span className="flex items-center gap-1 text-slate-500">
                                                <MessageSquare size={12} />
                                                {ticket._count.comments}
                                            </span>
                                        )}
                                    </div>
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
                            <h2 className="text-xl font-bold">{editingTicketId ? 'Edit Support Ticket' : 'Create New Ticket'}</h2>
                            <button onClick={() => { setShowCreateModal(false); setEditingTicketId(null); }} className="text-slate-400 hover:text-slate-600">
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

                            {/* Searchable Multi-Select Device Picker, Dynamic Common Issues & Varieties */}
                            {user?.role !== 'student' && (form.category === 'hardware_issue' || form.category === 'software_issue' || form.category === 'maintenance_request') && (
                                <div className="space-y-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {/* 1. Optional Lab Location Filter */}
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                                Lab Location {(form.category === 'hardware_issue' || form.category === 'software_issue') ? '(Filter)' : '(Optional)'}
                                            </label>
                                            <select
                                                value={form.labId}
                                                onChange={(e) => {
                                                    setForm({ ...form, labId: e.target.value });
                                                }}
                                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-primary-500"
                                            >
                                                <option value="">All Labs / Whole School Inventory</option>
                                                {labs.map(lab => (
                                                    <option key={lab.id} value={lab.id}>{lab.name} {lab.roomNumber ? `(Room ${lab.roomNumber})` : ''}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* 2. Optional Item Type Filter */}
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                                Filter Equipment Type
                                            </label>
                                            <select
                                                value={form.itemType}
                                                onChange={(e) => setForm({ ...form, itemType: e.target.value })}
                                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-primary-500"
                                            >
                                                <option value="">All Equipment Types</option>
                                                {Object.entries(ITEM_TYPE_LABELS).map(([typeKey, info]) => (
                                                    <option key={typeKey} value={typeKey}>
                                                        {info.icon} {info.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {/* 3. Searchable Multi-Select Device Selector */}
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="block text-xs font-semibold text-slate-700">
                                                Search & Select Devices (by Serial No. or Name)
                                            </label>
                                            {selectedDevices.length > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedDevices([])}
                                                    className="text-[11px] text-rose-600 hover:underline"
                                                >
                                                    Clear ({selectedDevices.length})
                                                </button>
                                            )}
                                        </div>

                                        {/* Selected Devices Chips */}
                                        {selectedDevices.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 mb-2 p-2 bg-white rounded-lg border border-primary-200">
                                                {selectedDevices.map(dev => (
                                                    <span
                                                        key={dev.id}
                                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-primary-50 border border-primary-300 text-primary-900 shadow-2xs"
                                                    >
                                                        <span>{ITEM_TYPE_LABELS[dev.itemType]?.icon || '📦'}</span>
                                                        <span className="font-semibold">{dev.itemNumber}</span>
                                                        <span className="font-mono text-[11px] font-bold bg-white px-1.5 py-0.5 rounded border border-primary-200 text-slate-800">
                                                            SN: {dev.serialNo || 'N/A'}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleSelectDevice(dev)}
                                                            className="text-primary-500 hover:text-rose-600 ml-0.5"
                                                            title="Remove device"
                                                        >
                                                            <X size={13} />
                                                        </button>
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        {/* Search Input Box */}
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                                            <input
                                                type="text"
                                                value={deviceSearchTerm}
                                                onChange={(e) => {
                                                    setDeviceSearchTerm(e.target.value);
                                                    setDeviceDropdownOpen(true);
                                                }}
                                                onFocus={() => setDeviceDropdownOpen(true)}
                                                placeholder="Type Serial Number, Brand, or Item Number (e.g. ZLA01SC..., Acer, PC)..."
                                                className="w-full pl-9 pr-8 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 font-sans"
                                            />
                                            {deviceSearchTerm && (
                                                <button
                                                    type="button"
                                                    onClick={() => setDeviceSearchTerm('')}
                                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                                >
                                                    <X size={14} />
                                                </button>
                                            )}

                                            {/* Results Dropdown */}
                                            {deviceDropdownOpen && (() => {
                                                const selectablePool = form.labId
                                                    ? (labItems.length > 0 ? labItems : allSchoolItems.filter(i => (i.labId || i.lab?.id) === form.labId))
                                                    : allSchoolItems;
                                                const searchedItems = selectablePool.filter(item => {
                                                    if (form.itemType && item.itemType !== form.itemType) return false;
                                                    if (!deviceSearchTerm.trim()) return true;
                                                    const term = deviceSearchTerm.toLowerCase();
                                                    return (
                                                        item.itemNumber?.toLowerCase().includes(term) ||
                                                        item.serialNo?.toLowerCase().includes(term) ||
                                                        item.brand?.toLowerCase().includes(term) ||
                                                        item.modelNo?.toLowerCase().includes(term) ||
                                                        item.itemType?.toLowerCase().includes(term) ||
                                                        item.lab?.name?.toLowerCase().includes(term)
                                                    );
                                                });

                                                return (
                                                    <div className="absolute top-full left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg z-30 divide-y divide-slate-100">
                                                        <div className="p-2 bg-slate-50 flex items-center justify-between text-[11px] text-slate-500 sticky top-0 border-b border-slate-200 z-10">
                                                            <span>Matching Equipment ({searchedItems.length})</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => setDeviceDropdownOpen(false)}
                                                                className="text-primary-600 hover:underline font-semibold"
                                                            >
                                                                Done
                                                            </button>
                                                        </div>
                                                        {searchedItems.length === 0 ? (
                                                            <div className="p-4 text-center text-xs text-slate-400">
                                                                No matching equipment found for &quot;{deviceSearchTerm}&quot;
                                                            </div>
                                                        ) : (
                                                            searchedItems.slice(0, 50).map(item => {
                                                                const isSelected = selectedDevices.some(d => d.id === item.id);
                                                                return (
                                                                    <div
                                                                        key={item.id}
                                                                        onClick={() => toggleSelectDevice(item)}
                                                                        className={`p-2.5 flex items-center justify-between gap-3 text-xs hover:bg-slate-50 cursor-pointer transition ${isSelected ? 'bg-primary-50/70 font-medium' : ''}`}
                                                                    >
                                                                        <div className="flex items-center gap-2 min-w-0">
                                                                            {isSelected ? (
                                                                                <CheckSquare size={16} className="text-primary-600 shrink-0" />
                                                                            ) : (
                                                                                <Square size={16} className="text-slate-300 shrink-0" />
                                                                            )}
                                                                            <span className="text-sm shrink-0">{ITEM_TYPE_LABELS[item.itemType]?.icon || '📦'}</span>
                                                                            <div className="truncate">
                                                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                                                    <span className="font-semibold text-slate-800">{item.itemNumber}</span>
                                                                                    <span className="text-slate-400 text-[11px]">({ITEM_TYPE_LABELS[item.itemType]?.label || item.itemType})</span>
                                                                                    {item.brand && (
                                                                                        <span className="text-slate-500 text-[11px]">{item.brand} {item.modelNo || ''}</span>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex items-center gap-1.5 shrink-0">
                                                                            <span className="font-mono text-[11px] font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-800 border border-slate-200">
                                                                                SN: {item.serialNo || 'N/A'}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </div>

                                    {/* 4. Dynamic Common Issues Checklist */}
                                    {(() => {
                                        const relevantTypes = selectedDevices.length > 0
                                            ? Array.from(new Set(selectedDevices.map(d => d.itemType))).filter(Boolean)
                                            : (form.itemType ? [form.itemType] : ['interactive_panel']);

                                        return (
                                            <div className="space-y-2 p-3 bg-amber-50/60 border border-amber-200 rounded-xl">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                                                        <Zap size={14} className="text-amber-600" />
                                                        <span>Common Issues for Selected Device(s)</span>
                                                    </div>
                                                    <span className="text-[10px] text-amber-700">Click to append to details</span>
                                                </div>
                                                <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                                                    {relevantTypes.map(t => {
                                                        const issues = COMMON_DEVICE_ISSUES[t] || COMMON_DEVICE_ISSUES.other;
                                                        return issues.map(iss => {
                                                            const isSelected = selectedCommonIssues.has(iss);
                                                            return (
                                                                <button
                                                                    key={iss}
                                                                    type="button"
                                                                    onClick={() => toggleCommonIssue(iss)}
                                                                    className={`px-2.5 py-1 rounded-lg text-xs transition border flex items-center gap-1.5 text-left ${
                                                                        isSelected
                                                                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs font-medium'
                                                                            : 'bg-white text-slate-700 border-slate-200 hover:border-amber-300 hover:bg-amber-50/50'
                                                                    }`}
                                                                >
                                                                    {isSelected ? <Check size={12} /> : <Plus size={12} className="text-slate-400" />}
                                                                    <span>{iss}</span>
                                                                </button>
                                                            );
                                                        });
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {/* 5. Custom Varieties & Accessories Fault Section */}
                                    <div className="border border-slate-200 rounded-xl p-3 bg-white space-y-2.5">
                                        <button
                                            type="button"
                                            onClick={() => setShowVarietySection(!showVarietySection)}
                                            className="w-full flex items-center justify-between text-xs font-semibold text-slate-700 hover:text-slate-900"
                                        >
                                            <span className="flex items-center gap-1.5">
                                                <Tag size={14} className="text-primary-600" />
                                                <span>Add Device Varieties / Accessories Faults (Stylus, Remote, Cables, etc.)</span>
                                            </span>
                                            {showVarietySection ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                        </button>

                                        {showVarietySection && (
                                            <div className="pt-2 border-t border-slate-200 space-y-2">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                    <div>
                                                        <label className="block text-[11px] font-medium text-slate-600 mb-1">Accessory / Component</label>
                                                        <select
                                                            value={customVariety.type}
                                                            onChange={(e) => setCustomVariety({ ...customVariety, type: e.target.value })}
                                                            className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                                                        >
                                                            <option value="Remote Control">Remote Control for Interactive Panel</option>
                                                            <option value="Digitizer Stylus">Digitizer Stylus / Digital Pen</option>
                                                            <option value="Extended Pointer">Extended Pointer</option>
                                                            <option value="HDMI Cable">HDMI Cable (1m/3m/5m)</option>
                                                            <option value="USB Cable">USB Type-A / Type-C Data Cable</option>
                                                            <option value="Power Adapter">Power Cable / Adapter</option>
                                                            <option value="Shutter Keys">Key Pairs for Shutter / Panel Enclosure</option>
                                                            <option value="Webcam Cable">Webcam Cable / Mount Stand</option>
                                                            <option value="Wireless Mic">Wireless Microphone & Receiver</option>
                                                            <option value="Other Accessory">Other Component / Accessory</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-[11px] font-medium text-slate-600 mb-1">Fault Note / Observation</label>
                                                        <div className="flex gap-1.5">
                                                            <input
                                                                type="text"
                                                                value={customVariety.note}
                                                                onChange={(e) => setCustomVariety({ ...customVariety, note: e.target.value })}
                                                                placeholder="e.g. Broken nib, loose connector"
                                                                className="flex-1 px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={handleAddVariety}
                                                                className="px-3 py-1.5 bg-primary-600 text-white rounded-lg text-xs font-medium hover:bg-primary-700 transition"
                                                            >
                                                                Add
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
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
                                    title={editingTicketId ? "Save Ticket Changes" : "Create Ticket"}
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
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-mono text-slate-400">{selectedTicket.ticketNumber}</span>
                                    {selectedTicket.academicYear && (
                                        <span className="flex items-center gap-1 text-xs font-semibold text-primary-700 bg-primary-50 px-2 py-0.5 rounded border border-primary-200">
                                            <Calendar size={12} />
                                            Session: {selectedTicket.academicYear.yearLabel}
                                        </span>
                                    )}
                                </div>
                                <h2 className="text-xl font-bold">{selectedTicket.title}</h2>
                            </div>
                            <div className="flex items-center gap-2">
                                {isAdmin && (
                                    <button
                                        type="button"
                                        onClick={() => handleOpenEdit(selectedTicket)}
                                        className="p-1.5 text-slate-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition"
                                        title="Edit Ticket"
                                    >
                                        <Edit3 size={18} />
                                    </button>
                                )}
                                <button onClick={() => setShowDetailModal(false)} className="text-slate-400 hover:text-slate-600" title="Close">
                                    <X size={24} />
                                </button>
                            </div>
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
