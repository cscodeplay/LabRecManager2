'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    TrendingUp, Users, FileText, Award, Download, BarChart3, Calendar, CheckCircle,
    Filter, UsersRound, School, Monitor, Sparkles, CheckSquare, Square, Eye, FileSpreadsheet, RefreshCw,
    ChevronLeft, ChevronRight, Mail, Send, X, Layers
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import api, { classesAPI, reportsAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import PageHeader from '@/components/PageHeader';
import * as XLSX from 'xlsx';

const ENTITY_CONFIG = {
    students: {
        label: 'Students & Roster',
        icon: Users,
        necessary: [
            { key: 'admissionNumber', label: 'Admission / Student ID' },
            { key: 'fullName', label: 'Student Name' },
            { key: 'className', label: 'Class Name (Enrolled)' }
        ],
        optional: [
            { key: 'rollNumber', label: 'Roll Number' },
            { key: 'gender', label: 'Gender' },
            { key: 'email', label: 'Email Address' },
            { key: 'phone', label: 'Phone Number' },
            { key: 'groupName', label: 'Group Name' },
            { key: 'assignedPc', label: 'PC Number / Lab PC' },
            { key: 'submissionsCount', label: 'Total Submissions' },
            { key: 'avgScore', label: 'Average Score (%)' }
        ]
    },
    classes: {
        label: 'Classes & Sections',
        icon: School,
        necessary: [
            { key: 'name', label: 'Class Name' },
            { key: 'gradeLevel', label: 'Grade Level' },
            { key: 'section', label: 'Section' }
        ],
        optional: [
            { key: 'stream', label: 'Stream' },
            { key: 'totalEnrolled', label: 'Total Students' },
            { key: 'boyCount', label: 'Male Count' },
            { key: 'girlCount', label: 'Female Count' },
            { key: 'groupsCount', label: 'Total Groups' },
            { key: 'pcsAssigned', label: 'PCs Allocated' }
        ]
    },
    groups: {
        label: 'Student Groups & PCs',
        icon: UsersRound,
        necessary: [
            { key: 'name', label: 'Group Name' },
            { key: 'className', label: 'Class Name' },
            { key: 'genderType', label: 'Gender Category' }
        ],
        optional: [
            { key: 'memberCount', label: 'Member Count' },
            { key: 'memberNames', label: 'Member Names' },
            { key: 'assignedPc', label: 'PC Number / Lab PC' },
            { key: 'labName', label: 'Lab Name' },
            { key: 'leaderName', label: 'Group Leader' }
        ]
    },
    assignments: {
        label: 'Assignments & Performance',
        icon: FileText,
        necessary: [
            { key: 'title', label: 'Assignment Title' },
            { key: 'experimentNumber', label: 'Experiment No' },
            { key: 'subjectName', label: 'Subject' }
        ],
        optional: [
            { key: 'programmingLanguage', label: 'Language' },
            { key: 'maxMarks', label: 'Max Marks' },
            { key: 'targetClasses', label: 'Target Class / Group' },
            { key: 'submissionsCount', label: 'Total Submissions' },
            { key: 'avgScore', label: 'Average Score' },
            { key: 'status', label: 'Status' }
        ]
    },
    lab_pcs: {
        label: 'Lab PCs & Inventory',
        icon: Monitor,
        necessary: [
            { key: 'itemNumber', label: 'PC Number' },
            { key: 'labName', label: 'Lab Name' },
            { key: 'status', label: 'Status' }
        ],
        optional: [
            { key: 'ipAddress', label: 'IP Address' },
            { key: 'macAddress', label: 'MAC Address' },
            { key: 'assignedGroup', label: 'Group Name' },
            { key: 'assignedClass', label: 'Class Name' }
        ]
    }
};

export default function ReportsPage() {
    const router = useRouter();
    const { user, isAuthenticated, _hasHydrated, selectedSessionId } = useAuthStore();
    const [activeTab, setActiveTab] = useState('builder'); // 'builder' or 'overview'

    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState('month');
    const [selectedClassId, setSelectedClassId] = useState('');
    const [genderFilter, setGenderFilter] = useState('all');
    const [classes, setClasses] = useState([]);

    // Custom Builder State
    const [selectedEntities, setSelectedEntities] = useState(['students']);
    const [columnSelection, setColumnSelection] = useState({
        students: ['admissionNumber', 'fullName', 'className', 'rollNumber', 'gender', 'email', 'phone', 'groupName', 'assignedPc'],
        classes: ['name', 'gradeLevel', 'section', 'stream', 'totalEnrolled', 'boyCount', 'girlCount'],
        groups: ['name', 'className', 'genderType', 'memberCount', 'memberNames', 'assignedPc'],
        assignments: ['title', 'experimentNumber', 'subjectName', 'maxMarks', 'status'],
        lab_pcs: ['itemNumber', 'labName', 'status', 'assignedGroup', 'assignedClass']
    });

    const [generatedReport, setGeneratedReport] = useState(null);
    const [generating, setGenerating] = useState(false);

    // Custom Report Pagination State
    const [tablePages, setTablePages] = useState({});
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // Table View Filter (tabs above preview tables: 'all', 'unified', or specific entity)
    const [viewTableKey, setViewTableKey] = useState('all');

    // Email Dispatch Modal State
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [emailForm, setEmailForm] = useState({
        to: '',
        subject: '',
        message: '',
        includeXlsx: true,
        includeCsv: false
    });
    const [sendingEmail, setSendingEmail] = useState(false);

    // Overview Stats State
    const [stats, setStats] = useState({
        totalStudents: 0, totalAssignments: 0, totalSubmissions: 0,
        gradedSubmissions: 0, submissionRate: 0, avgScore: 0, minScore: 0, maxScore: 0
    });
    const [gradeDistribution, setGradeDistribution] = useState([]);
    const [topPerformers, setTopPerformers] = useState([]);

    useEffect(() => {
        if (!_hasHydrated) return;
        if (!isAuthenticated) { router.push('/login'); return; }
        if (user?.role !== 'admin' && user?.role !== 'instructor' && user?.role !== 'principal') {
            router.push('/dashboard');
            return;
        }
        loadClasses();
        loadAnalyticsData();
        handleGenerateReport();
    }, [isAuthenticated, user, _hasHydrated, selectedSessionId]);

    const loadClasses = async () => {
        try {
            const res = await classesAPI.getAll();
            setClasses(res.data.data?.classes || []);
        } catch (error) {
            console.error('Failed to load classes:', error);
        }
    };

    const loadAnalyticsData = async () => {
        setLoading(true);
        try {
            const params = { dateRange };
            if (selectedClassId) params.classId = selectedClassId;
            const res = await api.get('/reports/analytics', { params });
            const data = res.data.data;

            setStats({
                totalStudents: data.totalStudents || 0,
                totalAssignments: data.totalAssignments || 0,
                totalSubmissions: data.totalSubmissions || 0,
                gradedSubmissions: data.gradedSubmissions || 0,
                submissionRate: data.submissionRate || 0,
                avgScore: data.avgScore || 0,
                minScore: data.minScore || 0,
                maxScore: data.maxScore || 0
            });
            setGradeDistribution(data.gradeDistribution || []);
            setTopPerformers(data.topPerformers || []);
        } catch (error) {
            console.error('Failed to load report analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleEntity = (entityKey) => {
        if (selectedEntities.includes(entityKey)) {
            if (selectedEntities.length === 1) {
                toast.error('At least one entity must be selected');
                return;
            }
            setSelectedEntities(selectedEntities.filter(e => e !== entityKey));
        } else {
            setSelectedEntities([...selectedEntities, entityKey]);
        }
    };

    const toggleColumn = (entityKey, colKey) => {
        const currentCols = columnSelection[entityKey] || [];
        const isSelected = currentCols.includes(colKey);

        const updatedCols = isSelected
            ? currentCols.filter(k => k !== colKey)
            : [...currentCols, colKey];

        setColumnSelection({
            ...columnSelection,
            [entityKey]: updatedCols
        });
    };

    const handleGenerateReport = async () => {
        setGenerating(true);
        try {
            const res = await reportsAPI.generateCustom({
                entities: selectedEntities,
                selectedColumns: columnSelection,
                filters: {
                    classId: selectedClassId,
                    gender: genderFilter,
                    dateRange
                }
            });
            const reportData = res.data?.data?.reportResults ? res.data.data : (res.data?.reportResults ? res.data : (res.data?.data || res.data));
            setGeneratedReport(reportData);
            toast.success('Report data generated successfully!');
        } catch (error) {
            console.error('Report generation error:', error);
            const msg = error.response?.data?.message || error.message || 'Failed to generate custom report';
            toast.error(msg);
        } finally {
            setGenerating(false);
        }
    };

    // Dispatch Report via Email
    const handleSendEmailReport = async (e) => {
        if (e) e.preventDefault();
        if (!emailForm.to || !emailForm.to.trim()) {
            toast.error('Please specify at least one recipient email address');
            return;
        }
        setSendingEmail(true);
        try {
            const reportTitle = (selectedEntities || ['Institutional']).map(e => ENTITY_CONFIG[e]?.label || e).join(' & ') + ' Report';
            await reportsAPI.sendEmail({
                to: emailForm.to.trim(),
                subject: emailForm.subject.trim() || `[LabRecManager] ${reportTitle} - ${new Date().toLocaleDateString()}`,
                message: emailForm.message.trim(),
                reportTitle,
                reportResults: generatedReport?.reportResults,
                entities: selectedEntities,
                selectedColumns: columnSelection,
                filters: {
                    classId: selectedClassId,
                    gender: genderFilter,
                    dateRange
                },
                formats: {
                    xlsx: emailForm.includeXlsx,
                    csv: emailForm.includeCsv
                }
            });
            toast.success(`Report email successfully sent to ${emailForm.to}!`);
            setShowEmailModal(false);
        } catch (err) {
            console.error('Send report email error:', err);
            const msg = err.response?.data?.message || err.message || 'Failed to dispatch report email';
            toast.error(msg);
        } finally {
            setSendingEmail(false);
        }
    };

    // Export Excel Workbooks with multi-tabs for each entity
    const handleExportXLSX = () => {
        if (!generatedReport || !generatedReport.reportResults) return;
        try {
            const workbook = XLSX.utils.book_new();
            let hasData = false;

            for (const key of Object.keys(generatedReport.reportResults)) {
                const res = generatedReport.reportResults[key];
                if (res.rows && res.rows.length > 0) {
                    hasData = true;
                    const worksheet = XLSX.utils.json_to_sheet(res.rows);
                    const sheetName = res.title.replace(/Report/g, '').trim().substring(0, 30);
                    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
                }
            }

            if (!hasData) {
                toast.error('No report data to export');
                return;
            }

            XLSX.writeFile(workbook, `LabRec_Custom_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
            toast.success('Multi-tab Excel workbook exported!');
        } catch (error) {
            console.error('XLSX export error:', error);
            toast.error('Failed to export Excel file');
        }
    };

    // Export CSV file
    const handleExportCSV = () => {
        if (!generatedReport || !generatedReport.reportResults) return;
        try {
            const keys = Object.keys(generatedReport.reportResults);
            if (keys.length === 0) return;

            const firstResult = generatedReport.reportResults[keys[0]];
            if (!firstResult.rows || firstResult.rows.length === 0) {
                toast.error('No rows to export');
                return;
            }

            const worksheet = XLSX.utils.json_to_sheet(firstResult.rows);
            const csvOutput = XLSX.utils.sheet_to_csv(worksheet);

            const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `LabRec_${firstResult.title.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success('CSV exported successfully!');
        } catch (error) {
            toast.error('Failed to export CSV');
        }
    };

    // Printable PDF Report
    const handleExportPDF = () => {
        if (!generatedReport || !generatedReport.reportResults) return;

        const printWindow = window.open('', '_blank');
        const results = generatedReport.reportResults;

        let contentHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>LabRec Multi-Entity Report</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; color: #1e293b; }
                    .header { text-align: center; border-b: 2px solid #3b82f6; padding-bottom: 15px; margin-bottom: 25px; }
                    .header h1 { margin: 0; color: #0f172a; font-size: 24px; }
                    .header p { margin: 5px 0 0 0; color: #64748b; font-size: 13px; }
                    .entity-section { margin-bottom: 35px; page-break-inside: avoid; }
                    .entity-title { font-size: 16px; font-weight: bold; color: #1e40af; border-left: 4px solid #3b82f6; padding-left: 10px; margin-bottom: 12px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
                    th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
                    th { background-color: #f1f5f9; color: #334155; font-weight: 600; }
                    tr:nth-child(even) { background-color: #f8fafc; }
                    .badge-girl { background-color: #fce7f3; color: #be185d; padding: 2px 6px; border-radius: 4px; font-weight: 600; }
                    .badge-boy { background-color: #dbeafe; color: #1e40af; padding: 2px 6px; border-radius: 4px; font-weight: 600; }
                    .footer { text-align: center; font-size: 11px; color: #94a3b8; margin-top: 40px; border-t: 1px solid #e2e8f0; padding-top: 10px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>LabRec Management System — Official Custom Report</h1>
                    <p>Generated on: ${new Date().toLocaleString()} | Filters: Class: ${selectedClassId || 'All'}, Gender: ${genderFilter.toUpperCase()}, Date Range: ${dateRange.toUpperCase()}</p>
                </div>
        `;

        for (const key of Object.keys(results)) {
            const section = results[key];
            if (!section.rows || section.rows.length === 0) continue;

            const headers = Object.keys(section.rows[0]);

            contentHtml += `
                <div class="entity-section">
                    <div class="entity-title">${section.title} (${section.count} Records)</div>
                    <table>
                        <thead>
                            <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
                        </thead>
                        <tbody>
                            ${section.rows.map(row => `
                                <tr>
                                    ${headers.map(h => {
                                        let val = row[h] ?? '-';
                                        if (val === 'Female') val = `<span class="badge-girl">Female</span>`;
                                        if (val === 'Male') val = `<span class="badge-boy">Male</span>`;
                                        return `<td>${val}</td>`;
                                    }).join('')}
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }

        contentHtml += `
                <div class="footer">
                    Laboratory & Record Management System (LabRec) — Confidentially Generated Report
                </div>
                <script>window.onload = function() { window.print(); };</script>
            </body>
            </html>
        `;

        printWindow.document.write(contentHtml);
        printWindow.document.close();
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-12">
            <PageHeader title="Reports & Analytics" titleHindi="रिपोर्ट और विश्लेषण">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setActiveTab('builder')}
                        className={`btn text-sm py-2 px-4 flex items-center gap-2 transition ${activeTab === 'builder' ? 'btn-primary' : 'btn-secondary'}`}
                    >
                        <Sparkles className="w-4 h-4" />
                        Custom Report Builder
                    </button>
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`btn text-sm py-2 px-4 flex items-center gap-2 transition ${activeTab === 'overview' ? 'btn-primary' : 'btn-secondary'}`}
                    >
                        <BarChart3 className="w-4 h-4" />
                        Analytics Overview
                    </button>
                </div>
            </PageHeader>

            <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">

                {/* --- CUSTOM REPORT BUILDER TAB --- */}
                {activeTab === 'builder' && (
                    <div className="space-y-6">
                        {/* STEP 1: Select Entities */}
                        <div className="card p-6 border border-slate-200 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                                        <span className="w-7 h-7 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center text-sm font-extrabold">1</span>
                                        Select Report Entities (Multi-Table)
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-1">Select one or more data modules to combine in your report package</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                                {Object.keys(ENTITY_CONFIG).map(key => {
                                    const cfg = ENTITY_CONFIG[key];
                                    const Icon = cfg.icon;
                                    const isSelected = selectedEntities.includes(key);

                                    return (
                                        <div
                                            key={key}
                                            onClick={() => toggleEntity(key)}
                                            className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                                                isSelected
                                                    ? 'border-primary-500 bg-primary-50/80 shadow-md shadow-primary-500/10'
                                                    : 'border-slate-200 hover:border-slate-300 bg-white'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isSelected ? 'bg-primary-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
                                                    <Icon className="w-5 h-5" />
                                                </div>
                                                {isSelected ? <CheckSquare className="w-5 h-5 text-primary-600" /> : <Square className="w-5 h-5 text-slate-300" />}
                                            </div>
                                            <p className="font-bold text-slate-900 text-sm">{cfg.label}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* STEP 2: Filter Toolbar */}
                        <div className="card p-6 border border-slate-200 shadow-sm">
                            <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2 mb-4">
                                <span className="w-7 h-7 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center text-sm font-extrabold">2</span>
                                Apply Filters & Scope
                            </h3>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Class Scope</label>
                                    <select
                                        value={selectedClassId}
                                        onChange={(e) => setSelectedClassId(e.target.value)}
                                        className="input w-full text-sm"
                                    >
                                        <option value="">All Classes</option>
                                        {classes.map((cls) => (
                                            <option key={cls.id} value={cls.id}>
                                                {cls.name} (Grade {cls.gradeLevel})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Gender Category</label>
                                    <select
                                        value={genderFilter}
                                        onChange={(e) => setGenderFilter(e.target.value)}
                                        className="input w-full text-sm"
                                    >
                                        <option value="all">All Genders</option>
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Date Range</label>
                                    <select
                                        value={dateRange}
                                        onChange={(e) => setDateRange(e.target.value)}
                                        className="input w-full text-sm"
                                    >
                                        <option value="all">All Time</option>
                                        <option value="month">Last 30 Days</option>
                                        <option value="quarter">Last 90 Days</option>
                                        <option value="year">This Academic Year</option>
                                    </select>
                                </div>

                                <div className="flex items-end">
                                    <button
                                        onClick={handleGenerateReport}
                                        disabled={generating}
                                        className="btn btn-primary py-2.5 px-4 flex items-center justify-center rounded-lg shadow-sm"
                                        title="Generate & Refresh Report Data"
                                    >
                                        <RefreshCw className={`w-5 h-5 ${generating ? 'animate-spin' : ''}`} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* STEP 3: Customize Necessary vs Optional Columns */}
                        <div className="card p-6 border border-slate-200 shadow-sm">
                            <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2 mb-4">
                                <span className="w-7 h-7 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center text-sm font-extrabold">3</span>
                                Column Selection (Necessary vs Optional Checkboxes)
                            </h3>

                            {/* Relational Cross-Table Compatibility Guide */}
                            <div className="mb-5 p-3.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-xl flex items-start gap-3">
                                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                                    <Layers className="w-4 h-4" />
                                </div>
                                <div className="text-xs text-slate-700 leading-relaxed">
                                    <span className="font-bold text-blue-900">Relational Cross-Table Linking:</span>{' '}
                                    All tables share standardized relational keys (<span className="font-semibold text-indigo-700 bg-white px-1.5 py-0.5 rounded border border-indigo-200">Class Name</span>, <span className="font-semibold text-indigo-700 bg-white px-1.5 py-0.5 rounded border border-indigo-200">Group Name</span>, <span className="font-semibold text-indigo-700 bg-white px-1.5 py-0.5 rounded border border-indigo-200">PC Number</span>, and <span className="font-semibold text-indigo-700 bg-white px-1.5 py-0.5 rounded border border-indigo-200">Lab Name</span>). This ensures exported Excel worksheets can be linked via VLOOKUP/XLOOKUP or analyzed in PowerBI without foreign key gaps.
                                </div>
                            </div>

                            <div className="space-y-6 divide-y divide-slate-100">
                                {selectedEntities.map(key => {
                                    const cfg = ENTITY_CONFIG[key];
                                    const Icon = cfg.icon;
                                    const selectedCols = columnSelection[key] || [];

                                    return (
                                        <div key={key} className="pt-4 first:pt-0">
                                            <div className="flex items-center gap-2 mb-3">
                                                <Icon className="w-5 h-5 text-primary-600" />
                                                <h4 className="font-bold text-slate-800 text-base">{cfg.label} Columns</h4>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                                                {/* Necessary Columns */}
                                                <div>
                                                    <p className="text-xs font-bold uppercase text-slate-500 mb-2 flex items-center gap-1">
                                                        <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded font-semibold text-[10px]">REQUIRED</span>
                                                        Necessary Columns (Default)
                                                    </p>
                                                    <div className="space-y-1.5">
                                                        {cfg.necessary.map(c => (
                                                            <label key={c.key} className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-not-allowed">
                                                                <CheckSquare className="w-4 h-4 text-emerald-600" />
                                                                <span>{c.label}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Optional Columns */}
                                                <div>
                                                    <p className="text-xs font-bold uppercase text-slate-500 mb-2 flex items-center gap-1">
                                                        <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded font-semibold text-[10px]">CUSTOMIZABLE</span>
                                                        Optional Columns (Check to Include)
                                                    </p>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {cfg.optional.map(c => {
                                                            const isChecked = selectedCols.includes(c.key);
                                                            return (
                                                                <label key={c.key} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:text-slate-900">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={isChecked}
                                                                        onChange={() => toggleColumn(key, c.key)}
                                                                        className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                                                                    />
                                                                    <span>{c.label}</span>
                                                                </label>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* STEP 4: Live Preview & Export Toolbar */}
                        {generatedReport && (
                            <div className="card p-6 border border-slate-200 shadow-sm space-y-6">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
                                    <div>
                                        <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                                            <Eye className="w-5 h-5 text-primary-600" />
                                            Live Report Data Preview
                                        </h3>
                                        <p className="text-xs text-slate-500">Ready to export across multi-tab Excel, CSV, or formatted PDF</p>
                                    </div>

                                    {/* EXPORT ACTION BUTTONS */}
                                    <div className="flex flex-wrap items-center gap-2">
                                        <button
                                            onClick={() => {
                                                const defaultSubject = `[LabRecManager] ${(selectedEntities || ['Institutional']).map(e => ENTITY_CONFIG[e]?.label || e).join(' & ')} Report - ${new Date().toLocaleDateString()}`;
                                                setEmailForm(prev => ({
                                                    ...prev,
                                                    to: prev.to || user?.email || 'charan881130@gmail.com',
                                                    subject: defaultSubject
                                                }));
                                                setShowEmailModal(true);
                                            }}
                                            className="btn bg-indigo-600 hover:bg-indigo-700 text-white p-2 px-3 flex items-center justify-center rounded-lg shadow-sm gap-1.5"
                                            title="Email Report (Excel/CSV Attachment) to Any Recipient"
                                        >
                                            <Mail className="w-5 h-5" />
                                            <span className="hidden sm:inline text-xs font-bold">Email Report</span>
                                        </button>
                                        <button
                                            onClick={handleExportXLSX}
                                            className="btn bg-emerald-600 hover:bg-emerald-700 text-white p-2 flex items-center justify-center rounded-lg shadow-sm"
                                            title="Export Multi-Tab Excel Workbook (XLSX)"
                                        >
                                            <FileSpreadsheet className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={handleExportPDF}
                                            className="btn bg-rose-600 hover:bg-rose-700 text-white p-2 flex items-center justify-center rounded-lg shadow-sm"
                                            title="Print / Download Formatted PDF Report"
                                        >
                                            <FileText className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={handleExportCSV}
                                            className="btn btn-secondary p-2 flex items-center justify-center rounded-lg shadow-2xs"
                                            title="Export Delimited CSV File"
                                        >
                                            <Download className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>

                                {/* Multi-Table Preview Tables */}
                                <div className="space-y-6">
                                    {/* Table View Selector Tabs */}
                                    <div className="flex items-center gap-2 overflow-x-auto pb-1 mb-2 border-b border-slate-200">
                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1 flex items-center gap-1 shrink-0">
                                            <Layers className="w-3.5 h-3.5" /> Tables:
                                        </span>
                                        <button
                                            onClick={() => setViewTableKey('all')}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                                                viewTableKey === 'all'
                                                    ? 'bg-primary-600 text-white shadow-xs'
                                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                            }`}
                                        >
                                            All Selected Tables ({Object.keys(generatedReport.reportResults).filter(k => k !== 'unified').length})
                                        </button>
                                        {generatedReport.reportResults.unified && (
                                            <button
                                                onClick={() => setViewTableKey('unified')}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                                                    viewTableKey === 'unified'
                                                        ? 'bg-indigo-600 text-white shadow-xs'
                                                        : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
                                                }`}
                                            >
                                                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                                                Unified Master View ({generatedReport.reportResults.unified.rows?.length || 0})
                                            </button>
                                        )}
                                        {Object.keys(generatedReport.reportResults).filter(k => k !== 'unified').map(key => {
                                            const entityRes = generatedReport.reportResults[key];
                                            const cfg = ENTITY_CONFIG[key];
                                            const count = entityRes.rows?.length || 0;
                                            return (
                                                <button
                                                    key={key}
                                                    onClick={() => setViewTableKey(key)}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
                                                        viewTableKey === key
                                                            ? 'bg-primary-600 text-white shadow-xs'
                                                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                                    }`}
                                                >
                                                    {cfg?.label || entityRes.title || key}
                                                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${viewTableKey === key ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-800'}`}>
                                                        {count}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* View mode indicator when multiple entities generated and unified is selected */}
                                    {generatedReport.reportResults.unified && (viewTableKey === 'unified' || viewTableKey === 'all') && (
                                        <div className="p-3 bg-primary-50 border border-primary-200 rounded-xl flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-primary-900 font-bold text-sm">
                                                <Sparkles className="w-5 h-5 text-primary-600" />
                                                <span>{viewTableKey === 'unified' ? 'Unified Master Joined View' : `Multi-Entity Mode: ${selectedEntities.length} entities selected. Switch tabs above to inspect each table separately.`}</span>
                                            </div>
                                        </div>
                                    )}

                                    {Object.keys(generatedReport.reportResults).map(key => {
                                        // Filter tables according to active viewTableKey
                                        if (viewTableKey !== 'all' && viewTableKey !== key) {
                                            return null;
                                        }
                                        if (viewTableKey === 'all' && key === 'unified' && Object.keys(generatedReport.reportResults).length > 1) {
                                            return null;
                                        }
                                        const res = generatedReport.reportResults[key];
                                        if (!res.rows || res.rows.length === 0) {
                                            return (
                                                <div key={key} className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-sm text-slate-500">
                                                    No records found for <strong>{res.title}</strong> under applied filters.
                                                </div>
                                            );
                                        }

                                        const headers = Object.keys(res.rows[0]);
                                        const currentPage = tablePages[key] || 1;
                                        const totalPages = Math.ceil(res.rows.length / rowsPerPage) || 1;
                                        const startIndex = (currentPage - 1) * rowsPerPage;
                                        const endIndex = Math.min(startIndex + rowsPerPage, res.rows.length);
                                        const currentRows = res.rows.slice(startIndex, endIndex);

                                        const handlePageChange = (newPage) => {
                                            setTablePages(prev => ({
                                                ...prev,
                                                [key]: Math.max(1, Math.min(newPage, totalPages))
                                            }));
                                        };

                                        return (
                                            <div key={key} className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                                                <div className="bg-slate-100 p-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200">
                                                    <h4 className="font-bold text-slate-900 text-sm">{res.title}</h4>
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                                                            <span>Rows:</span>
                                                            <select
                                                                value={rowsPerPage}
                                                                onChange={(e) => {
                                                                    setRowsPerPage(Number(e.target.value));
                                                                    setTablePages({});
                                                                }}
                                                                className="bg-white border border-slate-300 rounded px-2 py-0.5 text-xs focus:ring-1 focus:ring-primary-500 font-semibold"
                                                            >
                                                                <option value={10}>10</option>
                                                                <option value={25}>25</option>
                                                                <option value={50}>50</option>
                                                                <option value={100}>100</option>
                                                            </select>
                                                        </div>
                                                        <span className="px-2.5 py-0.5 bg-primary-100 text-primary-800 rounded-full text-xs font-semibold">
                                                            {res.rows.length} total records
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-xs text-left">
                                                        <thead className="bg-slate-50 sticky top-0 border-b border-slate-200">
                                                            <tr>
                                                                {headers.map(h => (
                                                                    <th key={h} className="px-4 py-2.5 font-bold text-slate-700 whitespace-nowrap">{h}</th>
                                                                ))}
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100">
                                                            {currentRows.map((row, idx) => (
                                                                <tr key={idx} className="hover:bg-slate-50">
                                                                    {headers.map(h => (
                                                                        <td key={h} className="px-4 py-2.5 text-slate-800 whitespace-nowrap">
                                                                            {row[h] === 'Female' ? (
                                                                                <span className="px-2 py-0.5 bg-pink-100 text-pink-700 font-bold rounded">Female</span>
                                                                            ) : row[h] === 'Male' ? (
                                                                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 font-bold rounded">Male</span>
                                                                            ) : (
                                                                                row[h] ?? '-'
                                                                            )}
                                                                        </td>
                                                                    ))}
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>

                                                {/* Pagination & Navigation Footer */}
                                                <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
                                                    <div>
                                                        Showing <span className="font-semibold text-slate-900">{res.rows.length > 0 ? startIndex + 1 : 0}</span> to <span className="font-semibold text-slate-900">{endIndex}</span> of <span className="font-semibold text-slate-900">{res.rows.length}</span> entries (Page <span className="font-semibold text-slate-900">{currentPage}</span> of <span className="font-semibold text-slate-900">{totalPages}</span>)
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => handlePageChange(currentPage - 1)}
                                                            disabled={currentPage === 1}
                                                            className="btn btn-secondary p-1.5 flex items-center justify-center rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                                            title="Previous Page"
                                                        >
                                                            <ChevronLeft className="w-4 h-4" />
                                                        </button>
                                                        <span className="px-2 font-bold text-slate-800">
                                                            {currentPage} / {totalPages}
                                                        </span>
                                                        <button
                                                            onClick={() => handlePageChange(currentPage + 1)}
                                                            disabled={currentPage >= totalPages}
                                                            className="btn btn-secondary p-1.5 flex items-center justify-center rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                                            title="Next Page"
                                                        >
                                                            <ChevronRight className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* --- ANALYTICS OVERVIEW TAB --- */}
                {activeTab === 'overview' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="card p-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center text-primary-600">
                                        <Users className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-slate-900">{stats.totalStudents}</p>
                                        <p className="text-sm text-slate-500">Students</p>
                                    </div>
                                </div>
                            </div>
                            <div className="card p-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600">
                                        <FileText className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-slate-900">{stats.totalAssignments}</p>
                                        <p className="text-sm text-slate-500">Assignments</p>
                                    </div>
                                </div>
                            </div>
                            <div className="card p-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                                        <CheckCircle className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-slate-900">{stats.submissionRate}%</p>
                                        <p className="text-sm text-slate-500">Submission Rate</p>
                                    </div>
                                </div>
                            </div>
                            <div className="card p-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
                                        <Award className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-slate-900">{stats.avgScore}%</p>
                                        <p className="text-sm text-slate-500">Average Score</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Top Performers Table */}
                        <div className="card p-6">
                            <h3 className="font-bold text-slate-900 text-lg mb-4 flex items-center gap-2">
                                <Award className="w-5 h-5 text-amber-500" />
                                Top Student Performers
                            </h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-4 py-3 font-semibold text-slate-700">Rank</th>
                                            <th className="px-4 py-3 font-semibold text-slate-700">Student Name</th>
                                            <th className="px-4 py-3 font-semibold text-slate-700">Gender</th>
                                            <th className="px-4 py-3 font-semibold text-slate-700">Submissions</th>
                                            <th className="px-4 py-3 font-semibold text-slate-700">Avg Score</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {topPerformers.map((tp, idx) => (
                                            <tr key={tp.id || idx} className="hover:bg-slate-50">
                                                <td className="px-4 py-3 font-bold text-slate-900">#{idx + 1}</td>
                                                <td className="px-4 py-3 font-medium text-slate-900">{tp.firstName} {tp.lastName}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-0.5 text-xs font-bold rounded ${tp.gender === 'female' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'}`}>
                                                        {tp.gender === 'female' ? 'Female' : 'Male'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-slate-600">{tp.submissionsCount}</td>
                                                <td className="px-4 py-3 font-bold text-emerald-600">{tp.avgScore}%</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* EMAIL REPORT DISPATCH MODAL */}
            {showEmailModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
                    <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 text-white p-5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center">
                                    <Mail className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-base leading-tight">Email Institutional Report</h3>
                                    <p className="text-xs text-indigo-100 mt-0.5">Send compiled data directly to any recipient</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowEmailModal(false)}
                                disabled={sendingEmail}
                                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Form */}
                        <form onSubmit={handleSendEmailReport} className="p-6 space-y-4">
                            {/* Resend Sandbox Guidance Banner */}
                            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2.5">
                                <div className="w-5 h-5 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center shrink-0 text-[11px] font-bold mt-0.5">
                                    i
                                </div>
                                <div className="leading-tight">
                                    <p className="font-bold text-amber-900">Resend Free-Tier Sandbox Restriction:</p>
                                    <p className="mt-1 text-[11px] text-amber-700 leading-normal">
                                        Free Resend accounts without a custom verified domain can only deliver testing emails to the registered account owner (<strong>charan881130@gmail.com</strong>). Click the preset button below to test safely!
                                    </p>
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="text-xs font-bold text-slate-700">Recipient Email(s) *</label>
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() => setEmailForm(prev => ({ ...prev, to: 'charan881130@gmail.com' }))}
                                            className="text-[10px] px-2 py-0.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-full font-bold transition"
                                        >
                                            + charan881130@gmail.com
                                        </button>
                                        {user?.email && user.email !== 'charan881130@gmail.com' && (
                                            <button
                                                type="button"
                                                onClick={() => setEmailForm(prev => ({ ...prev, to: user.email }))}
                                                className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-full font-semibold transition"
                                            >
                                                + My Email
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <input
                                    type="text"
                                    required
                                    value={emailForm.to}
                                    onChange={(e) => setEmailForm(prev => ({ ...prev, to: e.target.value }))}
                                    placeholder="e.g. principal@institution.edu, charan881130@gmail.com"
                                    className="input w-full text-sm font-medium"
                                />
                                <p className="text-[11px] text-slate-400 mt-1">Separate multiple recipients with commas.</p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Subject Line</label>
                                <input
                                    type="text"
                                    value={emailForm.subject}
                                    onChange={(e) => setEmailForm(prev => ({ ...prev, subject: e.target.value }))}
                                    placeholder="Report subject line"
                                    className="input w-full text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Administrative Note / Message (Optional)</label>
                                <textarea
                                    rows={3}
                                    value={emailForm.message}
                                    onChange={(e) => setEmailForm(prev => ({ ...prev, message: e.target.value }))}
                                    placeholder="Add any context, deadlines, or remarks for the recipient..."
                                    className="input w-full text-sm resize-none"
                                />
                            </div>

                            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                                <label className="block text-xs font-bold text-slate-700 mb-2">Include File Attachments:</label>
                                <div className="grid grid-cols-2 gap-3 text-xs">
                                    <label className="flex items-center gap-2 font-medium text-slate-700 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={emailForm.includeXlsx}
                                            onChange={(e) => setEmailForm(prev => ({ ...prev, includeXlsx: e.target.checked }))}
                                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <span>📊 Excel Workbook (.xlsx)</span>
                                    </label>
                                    <label className="flex items-center gap-2 font-medium text-slate-700 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={emailForm.includeCsv}
                                            onChange={(e) => setEmailForm(prev => ({ ...prev, includeCsv: e.target.checked }))}
                                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <span>📑 CSV File (.csv)</span>
                                    </label>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setShowEmailModal(false)}
                                    disabled={sendingEmail}
                                    className="btn btn-secondary px-4 py-2 text-xs font-bold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={sendingEmail}
                                    className="btn bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 text-xs font-bold flex items-center gap-2 rounded-lg shadow-sm disabled:opacity-50"
                                >
                                    {sendingEmail ? (
                                        <>
                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                            <span>Sending Email...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-4 h-4" />
                                            <span>Send Report Email</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
