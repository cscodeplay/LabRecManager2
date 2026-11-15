'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    Laptop, ArrowLeft, Plus, Search, RotateCcw, FileText,
    Share2, Mail, MessageCircle, Printer, User, Calendar,
    CheckCircle, Clock, AlertTriangle, X, Camera, Copy,
    Tv, Tablet, Sparkles, CheckSquare, Square, Edit2, Trash2,
    Eye, Download, Building, Users, Check, Info
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { labsAPI, classesAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import LabInfrastructureTabs from '@/components/LabInfrastructureTabs';
import GreenSegmentedSpinner from '@/components/GreenSegmentedSpinner';
import { formatDate, formatDateTime } from '@/lib/dateUtils';

const STANDARD_INTERACTIVE_PANEL_ITEMS = [
    { sNo: 1, nomenclature: 'Interactive Panel Acer 75 inch 32GB/4GB Android', serialNo: 'ZLA01SC018502004494700', remarks: 'Panel is secured inside ALUMINIUM shutter' },
    { sNo: 2, nomenclature: 'OPS computer 256GB/8GB (back panel) Win 11 Pro', serialNo: '', remarks: 'OPS is installed behind the Panel' },
    { sNo: 3, nomenclature: 'Logitech Webcam 4K MX BRIO with Type - C cable', serialNo: '2335LZ53DEQ', remarks: '' },
    { sNo: 4, nomenclature: 'Digitek DWM 101 Pro Wireless Microphone', serialNo: '8906038531207', remarks: '' },
    { sNo: 5, nomenclature: 'UPS 1600 VA MICROTEK', serialNo: '24I0U1704Q05020174', remarks: '' },
    { sNo: 6, nomenclature: 'Type A to USB cable(1 m)', serialNo: 'Qty -1', remarks: 'Data cable for PC' },
    { sNo: 7, nomenclature: 'HDMI cable (1m)', serialNo: 'Qty - 1', remarks: 'Video Cable for PC' },
    { sNo: 8, nomenclature: 'Remote Control for Panel with AAA x 2 batteries', serialNo: 'Qty - 1', remarks: 'For Panel' },
    { sNo: 9, nomenclature: '1 x Extended Pointers', serialNo: 'Qty -1', remarks: 'For writing' },
    { sNo: 10, nomenclature: '2 x Digitizer Stylus for writing', serialNo: 'Qty - 2', remarks: 'For writing' },
    { sNo: 11, nomenclature: '3 x key pairs for shutters', serialNo: 'Qty -3 pairs', remarks: 'for shutter 4 locks' }
];

const STANDARD_TABLET_LAB_ITEMS = [
    { sNo: 1, nomenclature: 'Samsung Galaxy Tab A9+ 11" 64GB WiFi', serialNo: 'Qty - 30 Tabs', remarks: 'Stored in secure charging cart' },
    { sNo: 2, nomenclature: 'Active Stylus Digital Pens for Tablets', serialNo: 'Qty - 30 Stylus', remarks: 'Equipped with palm rejection' },
    { sNo: 3, nomenclature: 'Charging Station Cart 32-Bay with UV disinfection', serialNo: '', remarks: 'Locked with master key' },
    { sNo: 4, nomenclature: 'Master Key for Tablet Cart Shutter', serialNo: 'Qty - 2 keys', remarks: 'Under Incharge custody' }
];

const CLASSROOM_VOUCHER_PRINT_STYLES = `
    @page { size: A4 portrait; margin: 10mm 14mm 10mm 14mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, -apple-system, sans-serif; color: #000; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .voucher-page { page-break-after: always; page-break-inside: avoid; padding-bottom: 20px; }
    .voucher-page:last-child { page-break-after: avoid; }
    .letterhead-container { width: 100%; margin-bottom: 10px; text-align: center; }
    .letterhead-img { width: 100%; max-height: 115px; object-fit: contain; display: block; margin: 0 auto; }
    .letterhead-fallback { text-align: center; border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 10px; }
    .voucher-title { font-size: 20px; font-weight: 800; letter-spacing: 1.5px; text-align: center; margin: 10px 0 12px 0; text-transform: uppercase; }
    .info-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
    .info-table td { border: 1.5px solid #000; padding: 6px 10px; font-size: 13px; }
    .info-label { font-weight: 700; background-color: #f8fafc; }
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
    .items-table th { border: 1.5px solid #000; padding: 6px 8px; font-size: 13px; font-weight: 800; background-color: #f1f5f9; }
    .items-table td { border: 1.5px solid #000; padding: 5px 8px; vertical-align: middle; }
    .signatures-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
    .signatures-table th { border: 1.5px solid #000; padding: 6px 8px; font-size: 12px; font-weight: 700; background-color: #f8fafc; text-align: center; }
    .signatures-table td.sig-space { border: 1.5px solid #000; height: 50px; vertical-align: bottom; text-align: center; padding: 4px; }
    .sig-name { font-size: 11px; color: #475569; }
    .conditions-box { margin-top: 10px; font-size: 11px; line-height: 1.45; }
    .conditions-title { font-weight: 700; margin-bottom: 4px; font-size: 12px; }
    .conditions-list { margin-left: 20px; }
    .conditions-list li { margin-bottom: 2px; }
    @media print { .no-print { display: none !important; } }
`;

const STATUS_COLORS = {
    issued: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Issued' },
    returned: { bg: 'bg-green-100', text: 'text-green-700', label: 'Returned' },
    overdue: { bg: 'bg-red-100', text: 'text-red-700', label: 'Overdue' },
    lost: { bg: 'bg-slate-100', text: 'text-slate-700', label: 'Lost' }
};

export default function LaptopIssuancesPage() {
    const router = useRouter();
    const { user, isAuthenticated, _hasHydrated } = useAuthStore();
    const [issuances, setIssuances] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Issue modal state
    const [showIssueModal, setShowIssueModal] = useState(false);
    const [availableLaptops, setAvailableLaptops] = useState([]);
    const [staffMembers, setStaffMembers] = useState([]);

    // Calculate default return date (April of current/next year - end of session)
    const getDefaultReturnDate = () => {
        const now = new Date();
        const year = now.getMonth() >= 3 ? now.getFullYear() + 1 : now.getFullYear(); // If after March, next year
        return `${year}-04-30`; // April 30
    };

    const [issueForm, setIssueForm] = useState({
        laptopId: '', issuedToId: '', purpose: '',
        expectedReturnDate: getDefaultReturnDate(),
        conditionOnIssue: 'good',
        remarks: '',
        // Component status fields
        screenStatus: 'working',
        keyboardStatus: 'working',
        touchpadStatus: 'working',
        batteryStatus: 'working',
        portsStatus: 'working',
        chargerStatus: 'working'
    });
    const [issuing, setIssuing] = useState(false);

    // Camera scanner state
    const [showCameraScanner, setShowCameraScanner] = useState(false);
    const scannerRef = useRef(null);
    const html5QrcodeRef = useRef(null);
    const voucherContentRef = useRef(null);

    // Return modal state
    const [showReturnModal, setShowReturnModal] = useState(false);
    const [selectedIssuance, setSelectedIssuance] = useState(null);
    const [returnForm, setReturnForm] = useState({ conditionOnReturn: 'good', returnRemarks: '' });
    const [returning, setReturning] = useState(false);

    // Voucher modal state
    const [showVoucherModal, setShowVoucherModal] = useState(false);
    const [voucherData, setVoucherData] = useState(null);

    // Section Switcher: 'classroom' (default) vs 'laptop'
    const [activeSection, setActiveSection] = useState('classroom');

    // Classroom Loan Vouchers State
    const [classroomVouchers, setClassroomVouchers] = useState([]);
    const [classroomLoading, setClassroomLoading] = useState(false);
    const [selectedClassroomVouchers, setSelectedClassroomVouchers] = useState(new Set());
    const [classroomSearchQuery, setClassroomSearchQuery] = useState('');
    const [classroomSessionFilter, setClassroomSessionFilter] = useState('all');
    const [showClassroomModal, setShowClassroomModal] = useState(false);
    const [editingClassroomVoucher, setEditingClassroomVoucher] = useState(null);
    const [classroomSaving, setClassroomSaving] = useState(false);

    const initialClassroomForm = {
        roomNumber: '',
        classSection: '',
        staffName: '',
        staffDesignation: 'Class Incharge / PGT',
        academicSession: '2024-2025',
        dateStr: new Date().toLocaleDateString('en-GB') + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        items: [...STANDARD_INTERACTIVE_PANEL_ITEMS],
        issuerSign: 'Lab Incharge',
        headOfSchoolSign: 'Principal',
        receiverSign: 'Class Incharge',
        conditions: [
            'The Receiver is fully responsible for the physical safety and proper operation of the issued hardware.',
            'Any loss, damage, or technical fault must be reported to the issuing authority immediately.',
            'The hardware must be used solely for the official or stated purpose of this loan.',
            'The item must be returned on the due date or upon immediate demand by the issuing authority.'
        ]
    };
    const [classroomForm, setClassroomForm] = useState(initialClassroomForm);

    useEffect(() => {
        loadClassroomVouchers();
    }, []);

    const loadClassroomVouchers = async () => {
        setClassroomLoading(true);
        try {
            const res = await labsAPI.getClassroomLoanVouchers();
            const serverVouchers = res.data?.data?.vouchers || [];
            if (serverVouchers.length > 0) {
                setClassroomVouchers(serverVouchers);
                localStorage.setItem('classroom_loan_vouchers_cache', JSON.stringify(serverVouchers));
            } else {
                const cached = localStorage.getItem('classroom_loan_vouchers_cache');
                if (cached) {
                    setClassroomVouchers(JSON.parse(cached));
                } else {
                    const sampleVoucher = {
                        id: 'sample-room-5',
                        voucherNo: 'LV-2024-25-RM05',
                        roomNumber: '5',
                        classSection: 'Room 5 (Smart Classroom)',
                        staffName: 'Class Incharge',
                        staffDesignation: 'Class Incharge / PGT',
                        academicSession: '2024-2025',
                        dateStr: new Date().toLocaleDateString('en-GB') + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        items: [...STANDARD_INTERACTIVE_PANEL_ITEMS],
                        issuerSign: 'Lab Incharge',
                        headOfSchoolSign: 'Principal',
                        receiverSign: 'Class Incharge',
                        conditions: [
                            'The Receiver is fully responsible for the physical safety and proper operation of the issued hardware.',
                            'Any loss, damage, or technical fault must be reported to the issuing authority immediately.',
                            'The hardware must be used solely for the official or stated purpose of this loan.',
                            'The item must be returned on the due date or upon immediate demand by the issuing authority.'
                        ]
                    };
                    setClassroomVouchers([sampleVoucher]);
                    labsAPI.createClassroomLoanVoucher(sampleVoucher).catch(() => {});
                }
            }
        } catch {
            const cached = localStorage.getItem('classroom_loan_vouchers_cache');
            if (cached) setClassroomVouchers(JSON.parse(cached));
        } finally {
            setClassroomLoading(false);
        }
    };

    const handleSaveClassroomVoucher = async (e) => {
        e.preventDefault();
        if (!classroomForm.roomNumber) {
            toast.error('Room number is required');
            return;
        }
        setClassroomSaving(true);
        try {
            if (editingClassroomVoucher) {
                await labsAPI.updateClassroomLoanVoucher(editingClassroomVoucher.id, classroomForm);
                toast.success(`Voucher for Room ${classroomForm.roomNumber} updated!`);
            } else {
                await labsAPI.createClassroomLoanVoucher(classroomForm);
                toast.success(`Voucher for Room ${classroomForm.roomNumber} created!`);
            }
            setShowClassroomModal(false);
            setEditingClassroomVoucher(null);
            setClassroomForm(initialClassroomForm);
            loadClassroomVouchers();
        } catch (err) {
            const updated = editingClassroomVoucher
                ? classroomVouchers.map(v => v.id === editingClassroomVoucher.id ? { ...v, ...classroomForm } : v)
                : [{ id: 'voucher-' + Date.now(), ...classroomForm }, ...classroomVouchers];
            setClassroomVouchers(updated);
            localStorage.setItem('classroom_loan_vouchers_cache', JSON.stringify(updated));
            toast.success('Voucher saved successfully');
            setShowClassroomModal(false);
        } finally {
            setClassroomSaving(false);
        }
    };

    const handleDeleteClassroomVoucher = async (voucher) => {
        if (!confirm(`Delete Loan Voucher for Room ${voucher.roomNumber}?`)) return;
        try {
            await labsAPI.deleteClassroomLoanVoucher(voucher.id);
            toast.success(`Voucher for Room ${voucher.roomNumber} deleted`);
        } catch {}
        const filtered = classroomVouchers.filter(v => v.id !== voucher.id);
        setClassroomVouchers(filtered);
        localStorage.setItem('classroom_loan_vouchers_cache', JSON.stringify(filtered));
        setSelectedClassroomVouchers(prev => {
            const next = new Set(prev);
            next.delete(voucher.id);
            return next;
        });
    };

    const toggleSelectClassroomVoucher = (id) => {
        setSelectedClassroomVouchers(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleSelectAllClassroomVouchers = () => {
        if (selectedClassroomVouchers.size === filteredClassroomVouchers.length && filteredClassroomVouchers.length > 0) {
            setSelectedClassroomVouchers(new Set());
        } else {
            setSelectedClassroomVouchers(new Set(filteredClassroomVouchers.map(v => v.id)));
        }
    };

    const generateClassroomVoucherHtml = (voucher) => {
        const itemsRows = (voucher.items || []).map((it, idx) => `
            <tr>
                <td style="text-align: center; font-weight: bold; padding: 5px 6px; border: 1.5px solid #000; font-size: 13px;">${idx + 1}</td>
                <td style="font-weight: bold; padding: 5px 8px; border: 1.5px solid #000; font-size: 13px;">${it.nomenclature || ''}</td>
                <td style="padding: 5px 8px; border: 1.5px solid #000; font-size: 13px; font-family: monospace;">${it.serialNo || ''}</td>
                <td style="padding: 5px 8px; border: 1.5px solid #000; font-size: 12px;">${it.remarks || ''}</td>
            </tr>
        `).join('');

        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        const letterheadImgUrl = `${origin}/school_letterhead.png`;

        return `
            <div class="voucher-page">
                <!-- School Letterhead Banner -->
                <div class="letterhead-container">
                    <img src="${letterheadImgUrl}" alt="School Letterhead" class="letterhead-img" onerror="this.style.display='none'; document.getElementById('letterhead-text-${voucher.id}').style.display='block';" />
                    <div id="letterhead-text-${voucher.id}" class="letterhead-fallback" style="display: none;">
                        <div style="font-size: 15px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">SENIOR SECONDARY RESIDENTIAL SCHOOL FOR MERITORIOUS STUDENTS.</div>
                        <div style="font-size: 14px; font-weight: 600;">Near Rose Garden, Ludhiana</div>
                        <div style="font-size: 14px; font-weight: 700; font-family: 'Gurmukhi MN', 'Arial Unicode MS', sans-serif;">ਸੀਨੀਅਰ ਸੈਕੰਡਰੀ ਰੈਜ਼ੀਡੈਂਸੀਅਲ ਸਕੂਲ ਫ਼ਾਰ ਮੈਰੀਟੋਰੀਅਸ ਸਟੂਡੈਂਟਸ</div>
                        <div style="font-size: 13px; font-family: 'Gurmukhi MN', 'Arial Unicode MS', sans-serif;">ਨੇੜੇ ਰੋਜ਼ ਗਾਰਡਨ, ਲੁਧਿਆਣਾ।</div>
                        <div style="font-size: 12px; margin-top: 4px; display: flex; justify-content: space-between; border-top: 1px solid #000; padding-top: 3px;">
                            <span>✉: meritoriousldh@gmail.com</span>
                            <span>Office ☎: 0161-2307485</span>
                        </div>
                    </div>
                </div>

                <!-- Title -->
                <div class="voucher-title">LOAN VOUCHER</div>

                <!-- Info Bar Table (Date & Time, Room No) -->
                <table class="info-table">
                    <tr>
                        <td class="info-label" style="width: 18%;">Date & Time:</td>
                        <td class="info-val" style="width: 42%; font-weight: 600;">${voucher.dateStr || new Date().toLocaleString()}</td>
                        <td class="info-label" style="width: 20%;">Room No.:</td>
                        <td class="info-val" style="width: 20%; font-size: 16px; font-weight: 800; text-align: center;">${voucher.roomNumber || ''}</td>
                    </tr>
                    ${(voucher.staffName || voucher.classSection) ? `
                    <tr>
                        <td class="info-label">Issued To:</td>
                        <td class="info-val" style="font-weight: 600;">${voucher.staffName || ''} ${voucher.staffDesignation ? `(${voucher.staffDesignation})` : ''}</td>
                        <td class="info-label">Class / Session:</td>
                        <td class="info-val" style="text-align: center; font-weight: 600;">${voucher.classSection ? `${voucher.classSection} • ` : ''}${voucher.academicSession || '2024-25'}</td>
                    </tr>
                    ` : ''}
                </table>

                <!-- Items Table -->
                <table class="items-table">
                    <thead>
                        <tr>
                            <th style="width: 7%; text-align: center;">S. No.</th>
                            <th style="width: 43%; text-align: left;">Item Nomenclature</th>
                            <th style="width: 28%; text-align: left;">Serial No.</th>
                            <th style="width: 22%; text-align: left;">Remarks</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsRows}
                    </tbody>
                </table>

                <!-- Signatures Table -->
                <table class="signatures-table">
                    <tr>
                        <th style="width: 33.3%;">Issuer's Sign with Designation</th>
                        <th style="width: 33.4%;">Seal & Sign (Head of School)</th>
                        <th style="width: 33.3%;">Receiver's Sign with Designation</th>
                    </tr>
                    <tr>
                        <td class="sig-space">
                            <div class="sig-name">${voucher.issuerSign || 'Lab Incharge'}</div>
                        </td>
                        <td class="sig-space">
                            <div class="sig-name">${voucher.headOfSchoolSign || 'Principal'}</div>
                        </td>
                        <td class="sig-space">
                            <div class="sig-name">${voucher.staffName || voucher.receiverSign || 'Class Incharge'}</div>
                        </td>
                    </tr>
                </table>

                <!-- Conditions for Receiver of Issued Hardware -->
                <div class="conditions-box">
                    <div class="conditions-title">Conditions for the Receiver of Issued Hardware:</div>
                    <ul class="conditions-list">
                        <li>The Receiver is fully responsible for the physical safety and proper operation of the issued hardware.</li>
                        <li>Any loss, damage, or technical fault must be reported to the issuing authority immediately.</li>
                        <li>The hardware must be used solely for the official or stated purpose of this loan.</li>
                        <li>The item must be returned on the due date or upon immediate demand by the issuing authority.</li>
                    </ul>
                </div>
            </div>
        `;
    };

    const printSingleClassroomVoucher = (voucher) => {
        const html = generateClassroomVoucherHtml(voucher);
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            toast.error('Please allow popups to print');
            return;
        }
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Loan Voucher - Room ${voucher.roomNumber}</title>
                <style>${CLASSROOM_VOUCHER_PRINT_STYLES}</style>
            </head>
            <body>
                ${html}
                <script>
                    window.onload = function() {
                        setTimeout(function() { window.print(); }, 400);
                    };
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    const bulkPrintClassroomVouchers = () => {
        if (selectedClassroomVouchers.size === 0) {
            toast.error('Select at least one voucher to print');
            return;
        }
        const selectedList = classroomVouchers.filter(v => selectedClassroomVouchers.has(v.id));
        if (selectedList.length === 0) return;

        const allHtml = selectedList.map(v => generateClassroomVoucherHtml(v)).join('');
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            toast.error('Please allow popups to print');
            return;
        }
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Classroom Loan Vouchers (${selectedList.length} Rooms)</title>
                <style>${CLASSROOM_VOUCHER_PRINT_STYLES}</style>
            </head>
            <body>
                <div class="no-print" style="padding: 12px 20px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <h3 style="font-size: 16px; font-weight: bold;">Loan Vouchers (${selectedList.length} Rooms Selected)</h3>
                        <p style="font-size: 12px; color: #64748b;">Multi-page print on A4 size paper with letterhead</p>
                    </div>
                    <button onclick="window.print()" style="background: #4f46e5; color: white; border: none; padding: 8px 16px; border-radius: 8px; font-weight: 600; cursor: pointer;">
                        Print All (${selectedList.length} Vouchers)
                    </button>
                </div>
                ${allHtml}
                <script>
                    window.onload = function() {
                        setTimeout(function() { window.print(); }, 400);
                    };
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    const filteredClassroomVouchers = useMemo(() => {
        return classroomVouchers.filter(v => {
            const matchesSearch = !classroomSearchQuery ||
                String(v.roomNumber).toLowerCase().includes(classroomSearchQuery.toLowerCase()) ||
                String(v.classSection || '').toLowerCase().includes(classroomSearchQuery.toLowerCase()) ||
                String(v.staffName || '').toLowerCase().includes(classroomSearchQuery.toLowerCase()) ||
                (v.items || []).some(it =>
                    it.nomenclature?.toLowerCase().includes(classroomSearchQuery.toLowerCase()) ||
                    it.serialNo?.toLowerCase().includes(classroomSearchQuery.toLowerCase())
                );
            const matchesSession = classroomSessionFilter === 'all' || v.academicSession === classroomSessionFilter;
            return matchesSearch && matchesSession;
        });
    }, [classroomVouchers, classroomSearchQuery, classroomSessionFilter]);

    useEffect(() => {
        if (!_hasHydrated) return;
        if (!isAuthenticated) { router.push('/login'); return; }
        const allowedRoles = ['admin', 'principal', 'lab_assistant'];
        if (!allowedRoles.includes(user?.role)) { router.push('/dashboard'); return; }
        loadIssuances();
    }, [isAuthenticated, _hasHydrated, statusFilter]);

    const loadIssuances = async () => {
        try {
            setLoading(true);
            const params = {};
            if (statusFilter !== 'all') params.status = statusFilter;
            const res = await labsAPI.getLaptopIssuances(params);
            setIssuances(res.data.data.issuances || []);
        } catch (error) {
            toast.error('Failed to load issuances');
        } finally {
            setLoading(false);
        }
    };

    const openIssueModal = async () => {
        try {
            const [laptopsRes, staffRes] = await Promise.all([
                labsAPI.getAvailableLaptops(),
                labsAPI.getStaffMembers()
            ]);
            setAvailableLaptops(laptopsRes.data.data.laptops || []);
            setStaffMembers(staffRes.data.data.staff || []);
            setShowIssueModal(true);
        } catch (error) {
            const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to load data';
            console.error('Load error:', error.response?.data || error);
            toast.error(errorMsg, { duration: 8000 });
        }
    };

    const handleIssueLaptop = async (e) => {
        e.preventDefault();
        if (!issueForm.laptopId || !issueForm.issuedToId) {
            toast.error('Please select laptop and staff member');
            return;
        }
        setIssuing(true);
        try {
            const res = await labsAPI.issueLaptop(issueForm);
            toast.success(res.data.message);
            setShowIssueModal(false);
            setIssueForm({ laptopId: '', issuedToId: '', purpose: '', expectedReturnDate: '', conditionOnIssue: 'good', remarks: '' });
            loadIssuances();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to issue laptop');
        } finally {
            setIssuing(false);
        }
    };

    const openReturnModal = (issuance) => {
        setSelectedIssuance(issuance);
        setReturnForm({ conditionOnReturn: 'good', returnRemarks: '' });
        setShowReturnModal(true);
    };

    const handleReturnLaptop = async (e) => {
        e.preventDefault();
        setReturning(true);
        try {
            const res = await labsAPI.returnLaptop(selectedIssuance.id, returnForm);
            toast.success(res.data.message);
            setShowReturnModal(false);
            loadIssuances();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to return laptop');
        } finally {
            setReturning(false);
        }
    };

    const openVoucher = async (issuance) => {
        try {
            const res = await labsAPI.getIssuanceVoucher(issuance.id);
            setVoucherData(res.data.data.voucher);
            setShowVoucherModal(true);
        } catch (error) {
            const errorMsg = error.response?.data?.message || error.message || 'Failed to load voucher';
            console.error('Voucher error:', error.response?.data || error);
            toast.error(errorMsg, { duration: 8000 });
        }
    };

    const getVoucherText = () => {
        if (!voucherData) return '';
        const v = voucherData;
        return `📋 LAPTOP ISSUANCE VOUCHER\n\n` +
            `Voucher No: ${v.voucherNumber}\n` +
            `Date: ${formatDate(v.issuedAt)}\n\n` +
            `🏫 ${v.school?.name || 'School'}\n\n` +
            `💻 LAPTOP DETAILS\n` +
            `Item No: ${v.laptop?.itemNumber}\n` +
            `Brand: ${v.laptop?.brand || 'N/A'}\n` +
            `Model: ${v.laptop?.modelNo || 'N/A'}\n` +
            `Serial: ${v.laptop?.serialNo || 'N/A'}\n\n` +
            `👤 ISSUED TO\n` +
            `Name: ${v.issuedTo?.firstName} ${v.issuedTo?.lastName}\n` +
            `Role: ${v.issuedTo?.role}\n` +
            `Email: ${v.issuedTo?.email}\n` +
            `Phone: ${v.issuedTo?.phone || 'N/A'}\n\n` +
            `📝 Purpose: ${v.purpose || 'N/A'}\n` +
            `Condition: ${v.conditionOnIssue}\n` +
            `Expected Return: ${v.expectedReturnDate ? formatDate(v.expectedReturnDate) : 'N/A'}\n\n` +
            `Issued By: ${v.issuedBy?.firstName} ${v.issuedBy?.lastName}`;
    };

    const shareViaWhatsApp = () => {
        const text = encodeURIComponent(getVoucherText());
        window.open(`https://wa.me/?text=${text}`, '_blank');
    };

    const shareViaEmail = () => {
        const subject = encodeURIComponent(`Laptop Issuance Voucher - ${voucherData?.voucherNumber}`);
        const body = encodeURIComponent(getVoucherText());
        window.open(`mailto:${voucherData?.issuedTo?.email || ''}?subject=${subject}&body=${body}`, '_blank');
    };

    const printVoucher = () => {
        // Build component status HTML
        const componentStatusHtml = voucherData?.componentStatus ?
            Object.entries(voucherData.componentStatus).map(([key, status]) => {
                const icons = { screen: '🖥️', keyboard: '⌨️', touchpad: '🖱️', battery: '🔋', ports: '🔌', charger: '⚡' };
                const colors = { working: '#16a34a', minor_issue: '#d97706', not_working: '#dc2626' };
                const labels = { working: '✓ Working', minor_issue: '⚠ Minor Issue', not_working: '✕ Not Working' };
                return `<div style="display: flex; align-items: center; gap: 8px;">
                    <span>${icons[key] || '•'}</span>
                    <span style="text-transform: capitalize;">${key}:</span>
                    <span style="color: ${colors[status] || '#475569'}; font-weight: ${status !== 'working' ? 'bold' : 'normal'};">${labels[status] || status}</span>
                </div>`;
            }).join('') : '';

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
            <head><title>Voucher - ${voucherData?.voucherNumber}</title>
            <style>
                * { box-sizing: border-box; margin: 0; padding: 0; }
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; padding: 30px; max-width: 500px; margin: auto; color: #1e293b; }
                .header { text-align: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #e2e8f0; }
                .voucher-number { font-size: 28px; font-weight: 700; color: #0f172a; }
                .voucher-subtitle { font-size: 14px; color: #64748b; margin-top: 4px; }
                .section { padding: 16px; border-radius: 12px; margin-bottom: 16px; }
                .section-blue { background: #eff6ff; }
                .section-green { background: #f0fdf4; }
                .section-slate { background: #f8fafc; }
                .section-amber { background: #fffbeb; }
                .section-title { font-weight: 600; margin-bottom: 12px; font-size: 15px; }
                .title-blue { color: #1e40af; }
                .title-green { color: #166534; }
                .title-slate { color: #0f172a; }
                .title-amber { color: #92400e; }
                .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 14px; }
                .grid-label { color: #3b82f6; }
                .grid-label-green { color: #22c55e; }
                .grid-label-slate { color: #64748b; }
                .row { font-size: 14px; margin-bottom: 6px; }
                .component-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 14px; }
                .signatures { display: flex; justify-content: space-between; margin-top: 50px; padding-top: 20px; }
                .signature { text-align: center; }
                .signature-line { border-top: 1px solid #334155; width: 150px; margin-top: 50px; padding-top: 8px; font-size: 12px; color: #64748b; }
                @media print { body { padding: 20px; } }
            </style>
            </head>
            <body>
                <div class="header">
                    <div class="voucher-number">${voucherData?.voucherNumber}</div>
                    <div class="voucher-subtitle">Laptop Issuance Voucher</div>
                </div>
                
                <div class="section section-blue">
                    <div class="section-title title-blue">Laptop Details</div>
                    <div class="grid">
                        <div><span class="grid-label">Item No:</span> ${voucherData?.laptop?.itemNumber || 'N/A'}</div>
                        <div><span class="grid-label">Brand:</span> ${voucherData?.laptop?.brand || 'N/A'}</div>
                        <div><span class="grid-label">Model:</span> ${voucherData?.laptop?.modelNo || 'N/A'}</div>
                        <div><span class="grid-label">Serial:</span> ${voucherData?.laptop?.serialNo || 'N/A'}</div>
                    </div>
                </div>
                
                <div class="section section-green">
                    <div class="section-title title-green">Issued To</div>
                    <div class="row"><span class="grid-label-green">Name:</span> ${voucherData?.issuedTo?.firstName} ${voucherData?.issuedTo?.lastName}</div>
                    <div class="row"><span class="grid-label-green">Role:</span> ${voucherData?.issuedTo?.role || 'N/A'}</div>
                    <div class="row"><span class="grid-label-green">Email:</span> ${voucherData?.issuedTo?.email || 'N/A'}</div>
                    <div class="row"><span class="grid-label-green">Phone:</span> ${voucherData?.issuedTo?.phone || 'N/A'}</div>
                </div>
                
                <div class="section section-slate">
                    <div class="section-title title-slate">Issue Details</div>
                    <div class="grid">
                        <div><span class="grid-label-slate">Issue Date:</span> ${formatDate(voucherData?.issuedAt)}</div>
                        <div><span class="grid-label-slate">Condition:</span> ${voucherData?.conditionOnIssue || 'good'}</div>
                        <div><span class="grid-label-slate">Expected Return:</span> ${voucherData?.expectedReturnDate ? formatDate(voucherData?.expectedReturnDate) : 'N/A'}</div>
                        <div><span class="grid-label-slate">Issued By:</span> ${voucherData?.issuedBy?.firstName} ${voucherData?.issuedBy?.lastName}</div>
                    </div>
                    ${voucherData?.purpose ? `<div class="row" style="margin-top: 8px;"><span class="grid-label-slate">Purpose:</span> ${voucherData.purpose}</div>` : ''}
                </div>
                
                ${componentStatusHtml ? `
                <div class="section section-amber">
                    <div class="section-title title-amber">Component Status at Issue</div>
                    <div class="component-grid">${componentStatusHtml}</div>
                </div>
                ` : ''}
                
                <div class="signatures">
                    <div class="signature">
                        <div class="signature-line">Issuer Signature</div>
                    </div>
                    <div class="signature">
                        <div class="signature-line">Receiver Signature</div>
                    </div>
                </div>
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    };

    const copyVoucherAsImage = async () => {
        if (!voucherContentRef.current) return;
        try {
            const html2canvas = (await import('html2canvas')).default;
            const canvas = await html2canvas(voucherContentRef.current, {
                backgroundColor: '#ffffff',
                scale: 2,
                useCORS: true
            });
            canvas.toBlob(async (blob) => {
                try {
                    await navigator.clipboard.write([
                        new ClipboardItem({ 'image/png': blob })
                    ]);
                    toast.success('Voucher copied! Paste in WhatsApp');
                } catch (err) {
                    // Fallback: download the image
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `voucher-${voucherData?.voucherNumber}.png`;
                    a.click();
                    URL.revokeObjectURL(url);
                    toast.success('Image downloaded (clipboard not supported)');
                }
            }, 'image/png');
        } catch (err) {
            console.error('Screenshot error:', err);
            toast.error('Failed to capture voucher');
        }
    };

    const filteredIssuances = issuances.filter(i =>
        i.laptop?.itemNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.issuedTo?.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.issuedTo?.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.voucherNumber?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return <GreenSegmentedSpinner fullscreen />;
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/admin/labs" className="text-slate-500 hover:text-slate-700">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div className="flex items-center gap-2">
                            <Tv className="w-6 h-6 text-indigo-600" />
                            <div>
                                <h1 className="text-xl font-semibold text-slate-900">Hardware & Device Issuance</h1>
                                <p className="text-xs text-slate-500">Classroom smart panels, tablets, accessories & laptop loan vouchers</p>
                            </div>
                        </div>
                    </div>
                    {activeSection === 'classroom' ? (
                        <button
                            onClick={() => {
                                setEditingClassroomVoucher(null);
                                setClassroomForm({
                                    ...initialClassroomForm,
                                    dateStr: new Date().toLocaleDateString('en-GB') + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                });
                                setShowClassroomModal(true);
                            }}
                            className="btn bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2 shadow-sm"
                        >
                            <Plus className="w-4 h-4" /> New Classroom Voucher
                        </button>
                    ) : (
                        <button onClick={openIssueModal} className="btn btn-primary">
                            <Plus className="w-4 h-4" /> Issue Laptop
                        </button>
                    )}
                </div>
            </header>
            <LabInfrastructureTabs activeTab="device-issuance" />

            {/* Sub-Section Switcher Tabs */}
            <div className="max-w-7xl mx-auto px-4 pt-6">
                <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
                    <button
                        onClick={() => setActiveSection('classroom')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                            activeSection === 'classroom'
                                ? 'bg-indigo-600 text-white shadow'
                                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                        }`}
                    >
                        <Tv className="w-4 h-4" />
                        <span>Classroom Hardware Loan Vouchers (Panels & Tabs)</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                            activeSection === 'classroom' ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-700'
                        }`}>
                            {classroomVouchers.length}
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveSection('laptop')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                            activeSection === 'laptop'
                                ? 'bg-blue-600 text-white shadow'
                                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                        }`}
                    >
                        <Laptop className="w-4 h-4" />
                        <span>Individual Laptop Issuances</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                            activeSection === 'laptop' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-700'
                        }`}>
                            {issuances.length}
                        </span>
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            {activeSection === 'classroom' ? (
                <main className="max-w-7xl mx-auto px-4 py-4">
                    {/* Toolbar & Filters */}
                    <div className="card p-4 mb-6">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="flex flex-1 min-w-[260px] gap-3">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Search Room No, staff, item nomenclature or serial..."
                                        value={classroomSearchQuery}
                                        onChange={(e) => setClassroomSearchQuery(e.target.value)}
                                        className="input pl-9 w-full text-sm"
                                    />
                                </div>
                                <select
                                    value={classroomSessionFilter}
                                    onChange={(e) => setClassroomSessionFilter(e.target.value)}
                                    className="input w-auto text-sm"
                                >
                                    <option value="all">All Sessions</option>
                                    <option value="2024-2025">2024-2025</option>
                                    <option value="2025-2026">2025-2026</option>
                                    <option value="2026-2027">2026-2027</option>
                                </select>
                            </div>

                            {/* Select All & Bulk Print Barcode/Voucher Buttons */}
                            <div className="flex items-center gap-3">
                                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer select-none font-medium">
                                    <input
                                        type="checkbox"
                                        checked={selectedClassroomVouchers.size > 0 && selectedClassroomVouchers.size === filteredClassroomVouchers.length}
                                        onChange={toggleSelectAllClassroomVouchers}
                                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                                    />
                                    <span>Select All ({filteredClassroomVouchers.length})</span>
                                </label>

                                {selectedClassroomVouchers.size > 0 && (
                                    <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-lg">
                                        <span className="text-xs font-semibold text-indigo-800">
                                            {selectedClassroomVouchers.size} Selected
                                        </span>
                                        {/* Icon-only bulk print button */}
                                        <button
                                            onClick={bulkPrintClassroomVouchers}
                                            title={`Bulk Print ${selectedClassroomVouchers.size} Selected Vouchers (A4 Portrait)`}
                                            className="p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded shadow transition-all hover:scale-105 active:scale-95"
                                        >
                                            <Printer className="w-5 h-5" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="card p-4 bg-indigo-50 border-indigo-100">
                            <div className="text-2xl font-bold text-indigo-800">{classroomVouchers.length}</div>
                            <div className="text-xs font-medium text-indigo-600 mt-1">Classroom Loan Vouchers</div>
                        </div>
                        <div className="card p-4 bg-blue-50 border-blue-100">
                            <div className="text-2xl font-bold text-blue-800">
                                {classroomVouchers.reduce((acc, v) => acc + (v.items?.filter(it => it.nomenclature?.toLowerCase().includes('panel') || it.nomenclature?.toLowerCase().includes('interactive')).length || 0), 0)}
                            </div>
                            <div className="text-xs font-medium text-blue-600 mt-1">Interactive Panels Issued</div>
                        </div>
                        <div className="card p-4 bg-emerald-50 border-emerald-100">
                            <div className="text-2xl font-bold text-emerald-800">
                                {classroomVouchers.reduce((acc, v) => acc + (v.items?.reduce((cnt, it) => cnt + (it.serialNo?.includes('Qty') ? parseInt(it.serialNo.replace(/\D/g, '')) || 1 : 1), 0) || 0), 0)}
                            </div>
                            <div className="text-xs font-medium text-emerald-600 mt-1">Total Hardware Items & Accessories</div>
                        </div>
                        <div className="card p-4 bg-slate-100 border-slate-200">
                            <div className="text-2xl font-bold text-slate-800">{selectedClassroomVouchers.size}</div>
                            <div className="text-xs font-medium text-slate-600 mt-1">Selected For Bulk Print</div>
                        </div>
                    </div>

                    {/* Vouchers List */}
                    {filteredClassroomVouchers.length === 0 ? (
                        <div className="card p-12 text-center bg-white border border-dashed border-slate-300">
                            <Tv className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                            <h3 className="text-base font-semibold text-slate-700">No Classroom Loan Vouchers Found</h3>
                            <p className="text-sm text-slate-500 mt-1">
                                {classroomSearchQuery ? 'Try clearing your search query.' : 'Create your first classroom loan voucher with school letterhead.'}
                            </p>
                            <button
                                onClick={() => {
                                    setEditingClassroomVoucher(null);
                                    setClassroomForm({
                                        ...initialClassroomForm,
                                        dateStr: new Date().toLocaleDateString('en-GB') + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                    });
                                    setShowClassroomModal(true);
                                }}
                                className="btn bg-indigo-600 hover:bg-indigo-700 text-white mt-4 inline-flex items-center gap-2"
                            >
                                <Plus className="w-4 h-4" /> Create First Voucher
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredClassroomVouchers.map(voucher => {
                                const isSelected = selectedClassroomVouchers.has(voucher.id);
                                return (
                                    <div
                                        key={voucher.id}
                                        className={`card p-5 bg-white border transition-all ${
                                            isSelected ? 'border-indigo-500 ring-2 ring-indigo-200 shadow-sm' : 'border-slate-200 hover:border-slate-300'
                                        }`}
                                    >
                                        <div className="flex flex-wrap items-start justify-between gap-4">
                                            {/* Left: Checkbox + Room details */}
                                            <div className="flex items-start gap-4">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => toggleSelectClassroomVoucher(voucher.id)}
                                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-5 h-5 mt-1 cursor-pointer"
                                                />
                                                <div>
                                                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                                        <span className="px-2.5 py-1 bg-indigo-100 text-indigo-800 font-bold text-sm rounded-md tracking-wide">
                                                            Room {voucher.roomNumber}
                                                        </span>
                                                        <span className="text-sm font-semibold text-slate-900">
                                                            {voucher.classSection || `Classroom ${voucher.roomNumber}`}
                                                        </span>
                                                        <span className="px-2 py-0.5 text-xs bg-slate-100 text-slate-700 rounded font-medium">
                                                            Session: {voucher.academicSession || '2024-2025'}
                                                        </span>
                                                    </div>

                                                    <div className="text-sm text-slate-700 flex items-center gap-2 mt-1">
                                                        <User className="w-4 h-4 text-slate-400" />
                                                        <span className="font-medium">Incharge:</span>
                                                        <span>{voucher.staffName || 'Class Incharge'}</span>
                                                        {voucher.staffDesignation && (
                                                            <span className="text-xs text-slate-500">({voucher.staffDesignation})</span>
                                                        )}
                                                    </div>

                                                    <div className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                                                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                                        <span>Issued: {voucher.dateStr}</span>
                                                    </div>

                                                    {/* Items Summary Pills */}
                                                    <div className="mt-3 flex flex-wrap gap-1.5 max-w-2xl">
                                                        <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full">
                                                            {voucher.items?.length || 0} Hardware Items:
                                                        </span>
                                                        {(voucher.items || []).slice(0, 5).map((it, idx) => (
                                                            <span
                                                                key={idx}
                                                                className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md font-mono"
                                                                title={`${it.nomenclature} - ${it.serialNo || 'No S/N'} (${it.remarks || ''})`}
                                                            >
                                                                {it.nomenclature?.length > 25 ? it.nomenclature.slice(0, 25) + '...' : it.nomenclature}
                                                            </span>
                                                        ))}
                                                        {(voucher.items?.length || 0) > 5 && (
                                                            <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md">
                                                                +{voucher.items.length - 5} more
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Right: Actions */}
                                            <div className="flex items-center gap-2 self-start">
                                                <button
                                                    onClick={() => printSingleClassroomVoucher(voucher)}
                                                    className="btn bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs flex items-center gap-1.5 shadow-sm"
                                                    title="Print Official A4 Loan Voucher"
                                                >
                                                    <Printer className="w-4 h-4 text-indigo-600" />
                                                    <span>Print A4 Voucher</span>
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setEditingClassroomVoucher(voucher);
                                                        setClassroomForm({ ...voucher });
                                                        setShowClassroomModal(true);
                                                    }}
                                                    className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                    title="Edit Voucher Details"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteClassroomVoucher(voucher)}
                                                    className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Delete Voucher"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </main>
            ) : (
                /* Laptop Issuances View */
                <main className="max-w-7xl mx-auto px-4 py-4">
                    {/* Filters */}
                    <div className="card p-4 mb-6">
                        <div className="flex flex-wrap gap-4">
                            <div className="relative flex-1 min-w-[200px]">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search by laptop, name, voucher..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="input pl-10 w-full"
                                />
                            </div>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="input w-auto"
                            >
                                <option value="all">All Status</option>
                                <option value="issued">Issued</option>
                                <option value="returned">Returned</option>
                                <option value="overdue">Overdue</option>
                            </select>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        {['issued', 'returned', 'overdue'].map(status => {
                            const count = issuances.filter(i => i.status === status).length;
                            const config = STATUS_COLORS[status];
                            return (
                                <div key={status} className={`card p-4 ${config.bg}`}>
                                    <div className={`text-2xl font-bold ${config.text}`}>{count}</div>
                                    <div className={`text-sm ${config.text}`}>{config.label}</div>
                                </div>
                            );
                        })}
                        <div className="card p-4 bg-slate-100">
                            <div className="text-2xl font-bold text-slate-700">{issuances.length}</div>
                            <div className="text-sm text-slate-600">Total</div>
                        </div>
                    </div>

                    {/* Issuances List */}
                    {filteredIssuances.length === 0 ? (
                        <div className="card p-12 text-center">
                            <Laptop className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                            <p className="text-slate-500">No device issuances found</p>
                            <button onClick={openIssueModal} className="btn btn-primary mt-4">
                                <Plus className="w-4 h-4" /> Issue First Laptop
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredIssuances.map(issuance => {
                                const status = STATUS_COLORS[issuance.status] || STATUS_COLORS.issued;
                                return (
                                    <div key={issuance.id} className="card p-4">
                                        <div className="flex flex-wrap items-start justify-between gap-4">
                                            <div className="flex items-start gap-4">
                                                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                                                    <Laptop className="w-6 h-6 text-blue-600" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-semibold text-slate-900">
                                                            {issuance.laptop?.itemNumber}
                                                        </span>
                                                        <span className={`px-2 py-0.5 text-xs rounded-full ${status.bg} ${status.text}`}>
                                                            {status.label}
                                                        </span>
                                                    </div>
                                                    <div className="text-sm text-slate-600">
                                                        {issuance.laptop?.brand} {issuance.laptop?.modelNo}
                                                    </div>
                                                    <div className="text-sm text-slate-500 mt-1">
                                                        Voucher: <span className="font-mono">{issuance.voucherNumber}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex-1 min-w-[200px]">
                                                <div className="flex items-center gap-2 text-sm text-slate-700">
                                                    <User className="w-4 h-4" />
                                                    <span className="font-medium">{issuance.issuedTo?.firstName} {issuance.issuedTo?.lastName}</span>
                                                    <span className="text-slate-400">({issuance.issuedTo?.role})</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                                                    <Calendar className="w-4 h-4" />
                                                    <span>Issued: {formatDate(issuance.issuedAt)}</span>
                                                </div>
                                                {issuance.returnedAt && (
                                                    <div className="flex items-center gap-2 text-sm text-green-600 mt-1">
                                                        <CheckCircle className="w-4 h-4" />
                                                        <span>Returned: {formatDate(issuance.returnedAt)}</span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => openVoucher(issuance)}
                                                    className="btn btn-secondary text-sm"
                                                >
                                                    <FileText className="w-4 h-4" /> Voucher
                                                </button>
                                                {issuance.status === 'issued' && (
                                                    <button
                                                        onClick={() => openReturnModal(issuance)}
                                                        className="btn btn-primary text-sm"
                                                    >
                                                        <RotateCcw className="w-4 h-4" /> Return
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </main>
            )}

            {/* Classroom Loan Voucher Modal */}
            {showClassroomModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[92vh] overflow-y-auto">
                        <div className="p-6 border-b flex items-center justify-between sticky top-0 bg-white z-10">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">
                                    {editingClassroomVoucher ? `Edit Loan Voucher - Room ${classroomForm.roomNumber}` : 'Create Classroom Hardware Loan Voucher'}
                                </h2>
                                <p className="text-xs text-slate-500">Prints on A4 portrait with school letterhead and 3 signatures</p>
                            </div>
                            <button
                                onClick={() => { setShowClassroomModal(false); setEditingClassroomVoucher(null); }}
                                className="text-slate-400 hover:text-slate-600 p-1"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveClassroomVoucher} className="p-6 space-y-5">
                            {/* Fast Template Buttons */}
                            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                                <label className="text-xs font-bold text-indigo-900 block mb-2">⚡ Quick Setup Presets:</label>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setClassroomForm(prev => ({
                                            ...prev,
                                            items: JSON.parse(JSON.stringify(STANDARD_INTERACTIVE_PANEL_ITEMS))
                                        }))}
                                        className="btn bg-white hover:bg-indigo-100 text-indigo-700 border border-indigo-300 text-xs flex items-center gap-1.5 shadow-sm"
                                    >
                                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                                        Standard Smart Panel Setup (11 Items)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setClassroomForm(prev => ({
                                            ...prev,
                                            items: JSON.parse(JSON.stringify(STANDARD_TABLET_LAB_ITEMS))
                                        }))}
                                        className="btn bg-white hover:bg-emerald-100 text-emerald-700 border border-emerald-300 text-xs flex items-center gap-1.5 shadow-sm"
                                    >
                                        <Tablet className="w-3.5 h-3.5 text-emerald-600" />
                                        Tablet Lab Setup (30 Tabs + Stylus)
                                    </button>
                                </div>
                            </div>

                            {/* Classroom & Staff Information */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="label text-xs font-semibold">Room No. *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. 5 or 102"
                                        value={classroomForm.roomNumber}
                                        onChange={(e) => setClassroomForm({ ...classroomForm, roomNumber: e.target.value })}
                                        className="input text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="label text-xs font-semibold">Class / Section</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. 10-A or Smart Classroom"
                                        value={classroomForm.classSection}
                                        onChange={(e) => setClassroomForm({ ...classroomForm, classSection: e.target.value })}
                                        className="input text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="label text-xs font-semibold">Academic Session</label>
                                    <select
                                        value={classroomForm.academicSession}
                                        onChange={(e) => setClassroomForm({ ...classroomForm, academicSession: e.target.value })}
                                        className="input text-sm"
                                    >
                                        <option value="2024-2025">2024-2025</option>
                                        <option value="2025-2026">2025-2026</option>
                                        <option value="2026-2027">2026-2027</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="label text-xs font-semibold">Staff / Incharge Name</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Sh. Harpreet Singh"
                                        value={classroomForm.staffName}
                                        onChange={(e) => setClassroomForm({ ...classroomForm, staffName: e.target.value })}
                                        className="input text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="label text-xs font-semibold">Staff Designation</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Class Incharge / PGT"
                                        value={classroomForm.staffDesignation}
                                        onChange={(e) => setClassroomForm({ ...classroomForm, staffDesignation: e.target.value })}
                                        className="input text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="label text-xs font-semibold">Date & Time</label>
                                    <input
                                        type="text"
                                        value={classroomForm.dateStr}
                                        onChange={(e) => setClassroomForm({ ...classroomForm, dateStr: e.target.value })}
                                        className="input text-sm"
                                    />
                                </div>
                            </div>

                            {/* Hardware Items Table */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                                        Hardware Items & Accessories ({classroomForm.items?.length || 0})
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const nextSNo = (classroomForm.items?.length || 0) + 1;
                                            setClassroomForm(prev => ({
                                                ...prev,
                                                items: [...prev.items, { sNo: nextSNo, nomenclature: '', serialNo: '', remarks: '' }]
                                            }));
                                        }}
                                        className="btn bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs py-1 px-2.5 flex items-center gap-1"
                                    >
                                        <Plus className="w-3.5 h-3.5" /> Add Row
                                    </button>
                                </div>

                                <div className="border border-slate-200 rounded-lg overflow-x-auto">
                                    <table className="w-full text-xs">
                                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                                            <tr>
                                                <th className="p-2 text-center w-10">#</th>
                                                <th className="p-2 text-left">Item Nomenclature *</th>
                                                <th className="p-2 text-left w-44">Serial No. / Qty</th>
                                                <th className="p-2 text-left w-48">Remarks</th>
                                                <th className="p-2 text-center w-10"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {(classroomForm.items || []).map((item, index) => (
                                                <tr key={index} className="hover:bg-slate-50/50">
                                                    <td className="p-2 text-center font-bold text-slate-500">
                                                        {index + 1}
                                                    </td>
                                                    <td className="p-1.5">
                                                        <input
                                                            type="text"
                                                            required
                                                            placeholder="e.g. Interactive Panel Acer 75 inch..."
                                                            value={item.nomenclature}
                                                            onChange={(e) => {
                                                                const newItems = [...classroomForm.items];
                                                                newItems[index].nomenclature = e.target.value;
                                                                setClassroomForm({ ...classroomForm, items: newItems });
                                                            }}
                                                            className="w-full px-2 py-1 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-indigo-500 font-medium"
                                                        />
                                                    </td>
                                                    <td className="p-1.5">
                                                        <input
                                                            type="text"
                                                            placeholder="e.g. ZLA01SC... or Qty - 1"
                                                            value={item.serialNo}
                                                            onChange={(e) => {
                                                                const newItems = [...classroomForm.items];
                                                                newItems[index].serialNo = e.target.value;
                                                                setClassroomForm({ ...classroomForm, items: newItems });
                                                            }}
                                                            className="w-full px-2 py-1 border border-slate-200 rounded text-xs font-mono"
                                                        />
                                                    </td>
                                                    <td className="p-1.5">
                                                        <input
                                                            type="text"
                                                            placeholder="Remarks / Placement..."
                                                            value={item.remarks}
                                                            onChange={(e) => {
                                                                const newItems = [...classroomForm.items];
                                                                newItems[index].remarks = e.target.value;
                                                                setClassroomForm({ ...classroomForm, items: newItems });
                                                            }}
                                                            className="w-full px-2 py-1 border border-slate-200 rounded text-xs text-slate-600"
                                                        />
                                                    </td>
                                                    <td className="p-1.5 text-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const newItems = classroomForm.items.filter((_, idx) => idx !== index);
                                                                setClassroomForm({ ...classroomForm, items: newItems });
                                                            }}
                                                            className="p-1 text-slate-400 hover:text-red-500 rounded"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Signatures Configuration */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                                <div>
                                    <label className="text-xs font-medium text-slate-600 block mb-1">Issuer's Sign Designation</label>
                                    <input
                                        type="text"
                                        value={classroomForm.issuerSign}
                                        onChange={(e) => setClassroomForm({ ...classroomForm, issuerSign: e.target.value })}
                                        className="input text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-slate-600 block mb-1">Head of School Designation</label>
                                    <input
                                        type="text"
                                        value={classroomForm.headOfSchoolSign}
                                        onChange={(e) => setClassroomForm({ ...classroomForm, headOfSchoolSign: e.target.value })}
                                        className="input text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-slate-600 block mb-1">Receiver's Sign Designation</label>
                                    <input
                                        type="text"
                                        value={classroomForm.receiverSign}
                                        onChange={(e) => setClassroomForm({ ...classroomForm, receiverSign: e.target.value })}
                                        className="input text-xs"
                                    />
                                </div>
                            </div>

                            {/* Modal Footer Actions */}
                            <div className="flex items-center justify-end gap-3 pt-4 border-t sticky bottom-0 bg-white">
                                <button
                                    type="button"
                                    onClick={() => { setShowClassroomModal(false); setEditingClassroomVoucher(null); }}
                                    className="btn btn-secondary text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={classroomSaving}
                                    className="btn bg-indigo-600 hover:bg-indigo-700 text-white text-sm flex items-center gap-2"
                                >
                                    <Printer className="w-4 h-4" />
                                    {classroomSaving ? 'Saving...' : 'Save & Prepare Voucher'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Issue Modal */}
            {showIssueModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b flex items-center justify-between">
                            <h2 className="text-lg font-semibold">Issue Laptop</h2>
                            <button onClick={() => setShowIssueModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleIssueLaptop} className="p-6 space-y-4">
                            {/* Barcode Scanner Section */}
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <label className="label text-blue-700 flex items-center gap-2 mb-2">
                                    <span>📷</span> Scan Barcode / Serial No
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Type or scan barcode/serial..."
                                        className="input font-mono flex-1"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                const scanned = e.target.value.trim().toUpperCase();
                                                const match = availableLaptops.find(l =>
                                                    l.serialNo?.toUpperCase() === scanned ||
                                                    l.itemNumber?.toUpperCase() === scanned
                                                );
                                                if (match) {
                                                    setIssueForm({ ...issueForm, laptopId: match.id });
                                                    toast.success(`Selected: ${match.itemNumber}`);
                                                    e.target.value = '';
                                                } else {
                                                    toast.error(`No laptop found: ${scanned}`);
                                                }
                                            }
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            setShowCameraScanner(true);
                                            // Dynamically import html5-qrcode
                                            try {
                                                const { Html5Qrcode } = await import('html5-qrcode');
                                                setTimeout(() => {
                                                    if (scannerRef.current) {
                                                        const scanner = new Html5Qrcode('camera-scanner');
                                                        html5QrcodeRef.current = scanner;
                                                        scanner.start(
                                                            { facingMode: 'environment' },
                                                            { fps: 10, qrbox: { width: 250, height: 100 } },
                                                            (decodedText) => {
                                                                // Barcode scanned!
                                                                const scanned = decodedText.trim().toUpperCase();
                                                                const match = availableLaptops.find(l =>
                                                                    l.serialNo?.toUpperCase() === scanned ||
                                                                    l.itemNumber?.toUpperCase() === scanned
                                                                );
                                                                if (match) {
                                                                    setIssueForm({ ...issueForm, laptopId: match.id });
                                                                    toast.success(`Scanned: ${match.itemNumber}`);
                                                                } else {
                                                                    toast.error(`No laptop found: ${scanned}`);
                                                                }
                                                                // Stop scanner after successful scan
                                                                scanner.stop().then(() => {
                                                                    setShowCameraScanner(false);
                                                                });
                                                            },
                                                            (errorMessage) => {
                                                                // Ignore scan errors, just keep trying
                                                            }
                                                        ).catch(err => {
                                                            toast.error('Camera access denied');
                                                            setShowCameraScanner(false);
                                                        });
                                                    }
                                                }, 100);
                                            } catch (err) {
                                                toast.error('Scanner not available');
                                                setShowCameraScanner(false);
                                            }
                                        }}
                                        className="btn bg-blue-500 hover:bg-blue-600 text-white"
                                    >
                                        <Camera className="w-5 h-5" />
                                    </button>
                                </div>
                                <p className="text-xs text-blue-600 mt-1">Type + Enter, or tap camera to scan</p>

                                {/* Camera Scanner Modal */}
                                {showCameraScanner && (
                                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100]">
                                        <div className="bg-white rounded-xl p-4 max-w-md w-full mx-4">
                                            <div className="flex justify-between items-center mb-4">
                                                <h3 className="font-semibold">Scan Barcode</h3>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (html5QrcodeRef.current) {
                                                            html5QrcodeRef.current.stop().catch(() => { });
                                                        }
                                                        setShowCameraScanner(false);
                                                    }}
                                                    className="text-slate-500 hover:text-slate-700"
                                                >
                                                    <X className="w-6 h-6" />
                                                </button>
                                            </div>
                                            <div
                                                id="camera-scanner"
                                                ref={scannerRef}
                                                className="w-full h-64 bg-black rounded-lg overflow-hidden"
                                            />
                                            <p className="text-center text-sm text-slate-500 mt-2">
                                                Point camera at laptop barcode/serial number
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="label">Select Laptop * (or use scanner above)</label>
                                <select
                                    value={issueForm.laptopId}
                                    onChange={(e) => setIssueForm({ ...issueForm, laptopId: e.target.value })}
                                    className="input"
                                    required
                                >
                                    <option value="">Choose laptop...</option>
                                    {availableLaptops.map(laptop => (
                                        <option key={laptop.id} value={laptop.id}>
                                            {laptop.itemNumber} - {laptop.brand} {laptop.modelNo} ({laptop.serialNo || 'No Serial'})
                                        </option>
                                    ))}
                                </select>
                                {availableLaptops.length === 0 && (
                                    <p className="text-sm text-amber-600 mt-1">No laptops available. Add laptops to inventory first.</p>
                                )}
                            </div>
                            <div>
                                <label className="label">Issue To (Staff Member) *</label>
                                <select
                                    value={issueForm.issuedToId}
                                    onChange={(e) => setIssueForm({ ...issueForm, issuedToId: e.target.value })}
                                    className="input"
                                    required
                                >
                                    <option value="">Choose staff member...</option>
                                    {staffMembers.map(staff => (
                                        <option key={staff.id} value={staff.id}>
                                            {staff.firstName} {staff.lastName} ({staff.role}) - {staff.email}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="label">Purpose</label>
                                <input
                                    type="text"
                                    value={issueForm.purpose}
                                    onChange={(e) => setIssueForm({ ...issueForm, purpose: e.target.value })}
                                    className="input"
                                    placeholder="e.g., Online teaching, Project work"
                                />
                            </div>

                            {/* Component Status Section */}
                            <div>
                                <label className="label mb-2">Component Status (at time of issue)</label>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-lg">
                                    {[
                                        { key: 'screenStatus', label: '🖥️ Screen' },
                                        { key: 'keyboardStatus', label: '⌨️ Keyboard' },
                                        { key: 'touchpadStatus', label: '🖱️ Touchpad' },
                                        { key: 'batteryStatus', label: '🔋 Battery' },
                                        { key: 'portsStatus', label: '🔌 Ports' },
                                        { key: 'chargerStatus', label: '⚡ Charger' }
                                    ].map(comp => (
                                        <div key={comp.key} className="flex items-center justify-between p-2 bg-white rounded border">
                                            <span className="text-sm">{comp.label}</span>
                                            <select
                                                value={issueForm[comp.key]}
                                                onChange={(e) => setIssueForm({ ...issueForm, [comp.key]: e.target.value })}
                                                className="text-xs border rounded px-1 py-0.5"
                                            >
                                                <option value="working">✓ Working</option>
                                                <option value="minor_issue">⚠ Minor Issue</option>
                                                <option value="not_working">✕ Not Working</option>
                                                <option value="na">N/A</option>
                                            </select>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Expected Return Date (Session End)</label>
                                    <input
                                        type="date"
                                        value={issueForm.expectedReturnDate}
                                        onChange={(e) => setIssueForm({ ...issueForm, expectedReturnDate: e.target.value })}
                                        className="input"
                                    />
                                    <p className="text-xs text-slate-500 mt-1">Default: End of session (April)</p>
                                </div>
                                <div>
                                    <label className="label">Overall Condition</label>
                                    <select
                                        value={issueForm.conditionOnIssue}
                                        onChange={(e) => setIssueForm({ ...issueForm, conditionOnIssue: e.target.value })}
                                        className="input"
                                    >
                                        <option value="excellent">Excellent</option>
                                        <option value="good">Good</option>
                                        <option value="fair">Fair</option>
                                        <option value="needs_repair">Needs Repair</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="label">Remarks</label>
                                <textarea
                                    value={issueForm.remarks}
                                    onChange={(e) => setIssueForm({ ...issueForm, remarks: e.target.value })}
                                    className="input"
                                    rows={2}
                                    placeholder="Any additional notes about condition, accessories, etc..."
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-4">
                                <button type="button" onClick={() => setShowIssueModal(false)} className="btn btn-secondary">
                                    Cancel
                                </button>
                                <button type="submit" disabled={issuing} className="btn btn-primary">
                                    {issuing ? 'Issuing...' : 'Issue Laptop'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Return Modal */}
            {showReturnModal && selectedIssuance && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
                        <div className="p-6 border-b flex items-center justify-between">
                            <h2 className="text-lg font-semibold">Return Laptop</h2>
                            <button onClick={() => setShowReturnModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleReturnLaptop} className="p-6 space-y-4">
                            <div className="p-3 bg-slate-50 rounded-lg">
                                <div className="font-medium">{selectedIssuance.laptop?.itemNumber}</div>
                                <div className="text-sm text-slate-600">
                                    Issued to: {selectedIssuance.issuedTo?.firstName} {selectedIssuance.issuedTo?.lastName}
                                </div>
                            </div>
                            <div>
                                <label className="label">Condition on Return</label>
                                <select
                                    value={returnForm.conditionOnReturn}
                                    onChange={(e) => setReturnForm({ ...returnForm, conditionOnReturn: e.target.value })}
                                    className="input"
                                >
                                    <option value="excellent">Excellent</option>
                                    <option value="good">Good</option>
                                    <option value="fair">Fair</option>
                                    <option value="damaged">Damaged</option>
                                    <option value="needs_repair">Needs Repair</option>
                                </select>
                            </div>
                            <div>
                                <label className="label">Notes</label>
                                <textarea
                                    value={returnForm.returnRemarks}
                                    onChange={(e) => setReturnForm({ ...returnForm, returnRemarks: e.target.value })}
                                    className="input"
                                    rows={2}
                                    placeholder="Any issues or notes..."
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-4">
                                <button type="button" onClick={() => setShowReturnModal(false)} className="btn btn-secondary">
                                    Cancel
                                </button>
                                <button type="submit" disabled={returning} className="btn btn-primary">
                                    {returning ? 'Processing...' : 'Confirm Return'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Voucher Modal */}
            {showVoucherModal && voucherData && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b flex items-center justify-between">
                            <h2 className="text-lg font-semibold">Issuance Voucher</h2>
                            <button onClick={() => setShowVoucherModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6">
                            {/* Voucher Content - wrapped in ref for screenshot capture */}
                            <div ref={voucherContentRef} className="bg-white p-4">
                                <div className="text-center mb-6">
                                    <div className="text-2xl font-bold text-slate-900">{voucherData.voucherNumber}</div>
                                    <div className="text-sm text-slate-500">Laptop Issuance Voucher</div>
                                </div>

                                <div className="space-y-4">
                                    <div className="p-4 bg-blue-50 rounded-lg">
                                        <h3 className="font-semibold text-blue-900 mb-2">Laptop Details</h3>
                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                            <div><span className="text-blue-700">Item No:</span> {voucherData.laptop?.itemNumber}</div>
                                            <div><span className="text-blue-700">Brand:</span> {voucherData.laptop?.brand || 'N/A'}</div>
                                            <div><span className="text-blue-700">Model:</span> {voucherData.laptop?.modelNo || 'N/A'}</div>
                                            <div><span className="text-blue-700">Serial:</span> {voucherData.laptop?.serialNo || 'N/A'}</div>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-green-50 rounded-lg">
                                        <h3 className="font-semibold text-green-900 mb-2">Issued To</h3>
                                        <div className="text-sm">
                                            <div><span className="text-green-700">Name:</span> {voucherData.issuedTo?.firstName} {voucherData.issuedTo?.lastName}</div>
                                            <div><span className="text-green-700">Role:</span> {voucherData.issuedTo?.role}</div>
                                            <div><span className="text-green-700">Email:</span> {voucherData.issuedTo?.email}</div>
                                            <div><span className="text-green-700">Phone:</span> {voucherData.issuedTo?.phone || 'N/A'}</div>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-slate-50 rounded-lg">
                                        <h3 className="font-semibold text-slate-900 mb-2">Issue Details</h3>
                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                            <div><span className="text-slate-600">Issue Date:</span> {formatDate(voucherData.issuedAt)}</div>
                                            <div><span className="text-slate-600">Condition:</span> {voucherData.conditionOnIssue}</div>
                                            <div><span className="text-slate-600">Expected Return:</span> {voucherData.expectedReturnDate ? formatDate(voucherData.expectedReturnDate) : 'N/A'}</div>
                                            <div><span className="text-slate-600">Issued By:</span> {voucherData.issuedBy?.firstName} {voucherData.issuedBy?.lastName}</div>
                                        </div>
                                        {voucherData.purpose && (
                                            <div className="mt-2 text-sm"><span className="text-slate-600">Purpose:</span> {voucherData.purpose}</div>
                                        )}
                                    </div>

                                    {/* Component Status Section */}
                                    {voucherData.componentStatus && Object.keys(voucherData.componentStatus).length > 0 && (
                                        <div className="p-4 bg-amber-50 rounded-lg">
                                            <h3 className="font-semibold text-amber-900 mb-2">Component Status at Issue</h3>
                                            <div className="grid grid-cols-2 gap-2 text-sm">
                                                {Object.entries(voucherData.componentStatus).map(([key, status]) => {
                                                    const statusColors = {
                                                        working: 'text-green-600',
                                                        minor_issue: 'text-amber-600 font-medium',
                                                        not_working: 'text-red-600 font-bold',
                                                        na: 'text-slate-400'
                                                    };
                                                    const icons = {
                                                        screen: '🖥️', keyboard: '⌨️', touchpad: '🖱️',
                                                        battery: '🔋', ports: '🔌', charger: '⚡'
                                                    };
                                                    const displayStatus = status === 'working' ? '✓ Working' :
                                                        status === 'minor_issue' ? '⚠ Minor Issue' :
                                                            status === 'not_working' ? '✕ Not Working' : '— N/A';
                                                    return (
                                                        <div key={key} className="flex items-center gap-2">
                                                            <span>{icons[key] || '•'}</span>
                                                            <span className="capitalize">{key}:</span>
                                                            <span className={statusColors[status] || 'text-slate-600'}>{displayStatus}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            {/* Highlight issues */}
                                            {Object.values(voucherData.componentStatus).some(s => s === 'minor_issue' || s === 'not_working') && (
                                                <div className="mt-2 p-2 bg-red-100 rounded text-red-800 text-sm">
                                                    ⚠️ <strong>Issues Found:</strong> {Object.entries(voucherData.componentStatus)
                                                        .filter(([, s]) => s === 'minor_issue' || s === 'not_working')
                                                        .map(([k]) => k).join(', ')}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {voucherData.status === 'returned' && (
                                        <div className="p-4 bg-green-100 rounded-lg">
                                            <h3 className="font-semibold text-green-900 mb-2">Return Details</h3>
                                            <div className="text-sm">
                                                <div><span className="text-green-700">Returned On:</span> {formatDate(voucherData.returnedAt)}</div>
                                                <div><span className="text-green-700">Condition:</span> {voucherData.conditionOnReturn}</div>
                                                {voucherData.receivedBy && (
                                                    <div><span className="text-green-700">Received By:</span> {voucherData.receivedBy.firstName} {voucherData.receivedBy.lastName}</div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div> {/* End voucherContentRef */}

                            {/* Share Actions */}
                            <div className="flex flex-wrap gap-2 mt-6 pt-6 border-t">
                                <button title="Copy Image" onClick={copyVoucherAsImage} className="btn  bg-purple-500 hover:bg-purple-600 text-white">
                                    <Copy className="w-5 h-5" />
                                </button>
                                <button onClick={printVoucher} className="btn btn-secondary flex-1">
                                    <Printer className="w-4 h-4" /> Print
                                </button>
                                <button onClick={shareViaWhatsApp} className="btn flex-1 bg-green-500 hover:bg-green-600 text-white">
                                    <MessageCircle className="w-4 h-4" /> WhatsApp
                                </button>
                                <button onClick={shareViaEmail} className="btn flex-1 bg-blue-500 hover:bg-blue-600 text-white">
                                    <Mail className="w-4 h-4" /> Email
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
