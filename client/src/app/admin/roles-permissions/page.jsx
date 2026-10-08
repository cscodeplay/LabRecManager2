'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
    Shield, ShieldAlert, CheckCircle2, Eye, Lock, Search,
    Filter, ArrowLeft, Users, Monitor, BookOpen, GraduationCap,
    HelpCircle, Video, Pencil, Clock, Ticket, Building, BarChart3,
    FileText, Database, Sparkles, Check, ChevronDown, Layers
} from 'lucide-react';
import PageHeader from '@/components/PageHeader';

// Comprehensive Role-Based Access Control Configuration
const ROLES = [
    { key: 'admin', label: 'Admin', color: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950/60 dark:text-red-300', count: 2, desc: 'Full institutional administrator with root access to database, system configurations, and school-wide data.' },
    { key: 'principal', label: 'Principal', color: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300', count: 1, desc: 'Academic supervisor with school-wide auditing and oversight rights across lectures, grades, and staff.' },
    { key: 'instructor', label: 'Instructor', color: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300', count: 8, desc: 'Teaching faculty managing course lectures, coding modules, quiz authoring, grading, and viva meetings.' },
    { key: 'lab_assistant', label: 'Lab Assistant', color: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300', count: 3, desc: 'Hardware and lab facility operator managing computer hardware inventory, shifting requests, and issue tickets.' },
    { key: 'student', label: 'Student', color: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300', count: 120, desc: 'Learner solving exercises, taking quizzes, submitting lab records, and joining live interactive lectures.' },
    { key: 'parent', label: 'Parent', color: 'bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-950/60 dark:text-teal-300', count: 110, desc: 'Guardian viewing child attendance, marks, report cards, fee receipts, and communicating with faculty.' },
    { key: 'accountant', label: 'Accountant', color: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300', count: 1, desc: 'Finance officer managing fee collections, procurement receipts, and financial audit reports.' }
];

const MODULE_CATEGORIES = [
    { key: 'all', label: 'All Modules' },
    { key: 'core', label: 'Core & Users' },
    { key: 'academics', label: 'Academics & Teaching' },
    { key: 'live', label: 'Live Collaboration' },
    { key: 'labs', label: 'Labs & Hardware' },
    { key: 'ops', label: 'Operations & Admin' }
];

// Access Levels:
// 'full': Read, Write, Delete (Full Control)
// 'view': View-only / Audit
// 'scoped': Access restricted strictly to own class, student ID, or personal tasks
// 'none': Blocked / No Access

const ROUTES_MATRIX = [
    // Core & Users
    {
        route: '/dashboard',
        label: 'Dashboard',
        category: 'core',
        description: 'Main landing page tailored to specific user role and key institutional metrics.',
        access: {
            admin: { level: 'full', notes: 'System-wide statistics, server health, user counts, activity feeds' },
            principal: { level: 'view', notes: 'Academic school overview, teacher attendance, department summaries' },
            instructor: { level: 'scoped', notes: 'My classes, pending submissions, upcoming lectures, student doubts' },
            lab_assistant: { level: 'scoped', notes: 'Lab inventory status, pending hardware shifts, open lab tickets' },
            student: { level: 'scoped', notes: 'Assigned assignments, pending quizzes, coding training, timetable' },
            parent: { level: 'scoped', notes: "Child's academic progress, attendance percentage, upcoming exams" },
            accountant: { level: 'scoped', notes: 'Fee collection summary, pending dues, procurement invoices' }
        }
    },
    {
        route: '/users',
        label: 'User Management',
        category: 'core',
        description: 'Directory and management of staff, students, and parent accounts.',
        access: {
            admin: { level: 'full', notes: 'Create, edit, delete, reset passwords, bulk CSV loom import' },
            principal: { level: 'view', notes: 'Search, inspect profiles, audit user activity' },
            instructor: { level: 'scoped', notes: 'View enrolled students in assigned classes only' },
            lab_assistant: { level: 'scoped', notes: 'Lookup student details for hardware issuance' },
            student: { level: 'none', notes: 'No access to directory (only own profile via /profile)' },
            parent: { level: 'none', notes: 'No access to user directory' },
            accountant: { level: 'view', notes: 'View student contact details for fee invoicing' }
        }
    },
    {
        route: '/classes',
        label: 'Class Management',
        category: 'core',
        description: 'Class streams, grade levels, sections, and student roster enrollments.',
        access: {
            admin: { level: 'full', notes: 'Create classes, assign teachers, manage student enrollments' },
            principal: { level: 'view', notes: 'Inspect all school classes, streams, and class sizes' },
            instructor: { level: 'scoped', notes: 'Manage assigned teaching classes and student groups' },
            lab_assistant: { level: 'view', notes: 'View class rosters for lab sessions' },
            student: { level: 'scoped', notes: 'View own enrolled class details and classmates' },
            parent: { level: 'scoped', notes: "View child's class schedule and assigned teachers" },
            accountant: { level: 'view', notes: 'Filter fees by class and stream' }
        }
    },

    // Academics & Teaching
    {
        route: '/assignments',
        label: 'Assignments Hub',
        category: 'academics',
        description: 'Coursework assignments, lab exercises, due dates, and problem statements.',
        access: {
            admin: { level: 'full', notes: 'Oversee and edit any school assignment' },
            principal: { level: 'view', notes: 'Audit assignment quality and curriculum pacing' },
            instructor: { level: 'full', notes: 'Create, edit, attach materials, publish to classes/groups' },
            lab_assistant: { level: 'view', notes: 'View lab assignment sheets and requirements' },
            student: { level: 'scoped', notes: 'View assignments assigned directly to student/class' },
            parent: { level: 'scoped', notes: "View child's homework and submission deadlines" },
            accountant: { level: 'none', notes: 'No academic assignment access' }
        }
    },
    {
        route: '/training',
        label: 'Interactive Coding Training',
        category: 'academics',
        description: 'Multi-language coding sandbox (Python, C++, Java, SQL, HTML) with AI tutor.',
        access: {
            admin: { level: 'full', notes: 'Create training curriculum, generate modules with AI RAG' },
            principal: { level: 'view', notes: 'Inspect curriculum coverage and completion stats' },
            instructor: { level: 'full', notes: 'Design coding units, write test cases, assign modules' },
            lab_assistant: { level: 'view', notes: 'Test execution environments and compiler support' },
            student: { level: 'scoped', notes: 'Solve exercises, run code in browser, earn XP and badges' },
            parent: { level: 'scoped', notes: "View child's coding progress and achievements" },
            accountant: { level: 'none', notes: 'No training access' }
        }
    },
    {
        route: '/quiz',
        label: 'AI Quiz Maker & Tests',
        category: 'academics',
        description: 'Automated MCQ assessments with LaTeX formulas, time limits, and question palettes.',
        access: {
            admin: { level: 'full', notes: 'Generate quizzes with AI, review all submissions, manage codes' },
            principal: { level: 'view', notes: 'Audit exam integrity and school-wide performance' },
            instructor: { level: 'full', notes: 'Author tests, set negative marking, assign to classes' },
            lab_assistant: { level: 'view', notes: 'Supervise online test sessions in computer labs' },
            student: { level: 'scoped', notes: 'Take assigned quizzes and review score with Question Palette' },
            parent: { level: 'scoped', notes: "View child's test scores and answer breakdowns" },
            accountant: { level: 'none', notes: 'No quiz access' }
        }
    },
    {
        route: '/submissions',
        label: 'Submissions & Review',
        category: 'academics',
        description: 'Student submission grading, feedback, revision requests, and marks entry.',
        access: {
            admin: { level: 'full', notes: 'Audit and modify any student submission grade' },
            principal: { level: 'view', notes: 'Monitor grading turnaround time and teacher feedback' },
            instructor: { level: 'full', notes: 'Grade submissions, request revisions, enter marks' },
            lab_assistant: { level: 'scoped', notes: 'Verify practical lab record submissions' },
            student: { level: 'scoped', notes: 'Submit work, view teacher remarks and grades' },
            parent: { level: 'scoped', notes: "View submitted assignments and teacher evaluations" },
            accountant: { level: 'none', notes: 'No submission grading access' }
        }
    },
    {
        route: '/grades',
        label: 'Gradebook & Transcripts',
        category: 'academics',
        description: 'Cumulative academic marks, GPA calculation, report cards, and certificates.',
        access: {
            admin: { level: 'full', notes: 'Publish official report cards and semester transcripts' },
            principal: { level: 'view', notes: 'Audit class grade curves and honor roll lists' },
            instructor: { level: 'full', notes: 'Input term marks, practical marks, and attendance scores' },
            lab_assistant: { level: 'scoped', notes: 'Enter practical exam attendance and lab marks' },
            student: { level: 'scoped', notes: 'View personal grade history, report card, and GPA' },
            parent: { level: 'scoped', notes: "Download child's verified report cards and remarks" },
            accountant: { level: 'view', notes: 'Verify fee clearance before report card generation' }
        }
    },

    // Live Collaboration
    {
        route: '/whiteboard',
        label: 'Interactive Whiteboard (Host)',
        category: 'live',
        description: 'Infinite canvas workspace with shape engines, equations, and audio recording.',
        access: {
            admin: { level: 'full', notes: 'Host standalone canvas, inspect school whiteboard files' },
            principal: { level: 'view', notes: 'View faculty whiteboard sessions' },
            instructor: { level: 'full', notes: 'Draw, import PDFs/images, start live share with students' },
            lab_assistant: { level: 'scoped', notes: 'Assistant canvas presenter during lab demos' },
            student: { level: 'none', notes: 'Auto-redirected to /live-board interactive viewer' },
            parent: { level: 'none', notes: 'No whiteboard host access' },
            accountant: { level: 'none', notes: 'No whiteboard access' }
        }
    },
    {
        route: '/live-board',
        label: 'Live Whiteboard Stream',
        category: 'live',
        description: 'Real-time viewer for students receiving shared whiteboard lectures from instructors.',
        access: {
            admin: { level: 'view', notes: 'Monitor participant stream' },
            principal: { level: 'view', notes: 'Observe classroom lecture in progress' },
            instructor: { level: 'full', notes: 'Verify student viewport sync' },
            lab_assistant: { level: 'view', notes: 'Assist connected students with technical issues' },
            student: { level: 'full', notes: 'Real-time interactive canvas sync with instructor' },
            parent: { level: 'none', notes: 'No live-board access' },
            accountant: { level: 'none', notes: 'No live-board access' }
        }
    },
    {
        route: '/meetings',
        label: 'Live Video & Viva Room',
        category: 'live',
        description: 'WebRTC video conferencing for online oral exams (viva) and parent-teacher meetings.',
        access: {
            admin: { level: 'full', notes: 'Schedule, host, record, and forcibly end any meeting' },
            principal: { level: 'full', notes: 'Host all-staff meetings or join classroom vivas' },
            instructor: { level: 'full', notes: 'Schedule one-on-one vivas or class lectures' },
            lab_assistant: { level: 'scoped', notes: 'Manage lab audio/video equipment in viva sessions' },
            student: { level: 'scoped', notes: 'Join scheduled viva rooms and oral presentations' },
            parent: { level: 'scoped', notes: 'Join scheduled Parent-Teacher Conferences (PTM)' },
            accountant: { level: 'scoped', notes: 'Join administrative staff meetings' }
        }
    },

    // Labs & Hardware
    {
        route: '/admin/labs',
        label: 'Lab & PC Inventory',
        category: 'labs',
        description: 'Computer lab management, PC seat mapping, and hardware specifications.',
        access: {
            admin: { level: 'full', notes: 'Create labs, configure PC numbers, manage components' },
            principal: { level: 'view', notes: 'Inspect lab capacity and hardware allocation stats' },
            instructor: { level: 'view', notes: 'View lab seat layouts and available workstations' },
            lab_assistant: { level: 'full', notes: 'Log hardware maintenance, submit shift requests' },
            student: { level: 'scoped', notes: 'View assigned computer number and lab rules' },
            parent: { level: 'none', notes: 'No lab hardware access' },
            accountant: { level: 'view', notes: 'Audit hardware asset values for depreciation' }
        }
    },
    {
        route: '/admin/labs/shift-requests',
        label: 'Hardware Shift Requests',
        category: 'labs',
        description: 'Workflows for shifting PCs, monitors, and peripherals between labs or repair centers.',
        access: {
            admin: { level: 'full', notes: 'Approve or reject equipment relocation requests' },
            principal: { level: 'view', notes: 'Audit asset movement history' },
            instructor: { level: 'scoped', notes: 'Request temporary hardware for demo lessons' },
            lab_assistant: { level: 'full', notes: 'Initiate and execute physical equipment relocations' },
            student: { level: 'none', notes: 'No hardware shifting access' },
            parent: { level: 'none', notes: 'No hardware shifting access' },
            accountant: { level: 'view', notes: 'Track asset location for insurance records' }
        }
    },

    // Operations & Admin
    {
        route: '/documents',
        label: 'Documents & File Hub',
        category: 'ops',
        description: 'Cloud document storage, study materials, syllabi, circulars, and recordings.',
        access: {
            admin: { level: 'full', notes: 'Manage school cloud storage, folders, and access rules' },
            principal: { level: 'full', notes: 'Publish official circulars and academic policy docs' },
            instructor: { level: 'full', notes: 'Upload study material, lecture notes, shared PDFs' },
            lab_assistant: { level: 'full', notes: 'Maintain software manuals, driver downloads, OS guides' },
            student: { level: 'scoped', notes: 'Download study materials shared with student/class' },
            parent: { level: 'scoped', notes: 'Download school notices, newsletters, and receipts' },
            accountant: { level: 'full', notes: 'Store vendor invoices, audit files, and balance sheets' }
        }
    },
    {
        route: '/timetable',
        label: 'Timetable Schedules',
        category: 'ops',
        description: 'Weekly period schedules, teacher substitutions, and room allocations.',
        access: {
            admin: { level: 'full', notes: 'Generate master timetable and configure periods' },
            principal: { level: 'full', notes: 'Approve substitutions and teacher room allocations' },
            instructor: { level: 'scoped', notes: 'View personal teaching schedule and free periods' },
            lab_assistant: { level: 'view', notes: 'View lab occupancy schedule' },
            student: { level: 'scoped', notes: 'View daily class period schedule and room numbers' },
            parent: { level: 'scoped', notes: "View child's weekly timetable" },
            accountant: { level: 'none', notes: 'No timetable access' }
        }
    },
    {
        route: '/tickets',
        label: 'Support Tickets & Helpdesk',
        category: 'ops',
        description: 'IT support, hardware breakdown reporting, and academic grievance resolution.',
        access: {
            admin: { level: 'full', notes: 'Assign and resolve all institutional tickets' },
            principal: { level: 'view', notes: 'Supervise ticket resolution speed and escalations' },
            instructor: { level: 'scoped', notes: 'Report classroom projector/PC faults' },
            lab_assistant: { level: 'full', notes: 'Resolve hardware breakdown tickets and repair logs' },
            student: { level: 'scoped', notes: 'Report assigned PC faults or software issues' },
            parent: { level: 'scoped', notes: 'Submit administrative inquiries or transport doubts' },
            accountant: { level: 'scoped', notes: 'Report finance software/printer issues' }
        }
    },
    {
        route: '/activity-logs',
        label: 'Audit Trail & Activity Logs',
        category: 'ops',
        description: 'Security audit logs tracking logins, data modifications, and file downloads.',
        access: {
            admin: { level: 'full', notes: 'Search and export all system security and change logs' },
            principal: { level: 'view', notes: 'Audit staff activity and compliance logs' },
            instructor: { level: 'scoped', notes: 'View own activity history' },
            lab_assistant: { level: 'scoped', notes: 'View own lab equipment log history' },
            student: { level: 'none', notes: 'No access to system audit logs' },
            parent: { level: 'none', notes: 'No access to system audit logs' },
            accountant: { level: 'scoped', notes: 'View billing and fee log records' }
        }
    },
    {
        route: '/admin/sql-console',
        label: 'Database SQL Console',
        category: 'ops',
        description: 'Direct SQL execution tool for PostgreSQL database administration and bulk operations.',
        access: {
            admin: { level: 'full', notes: 'Execute raw queries, generate backups, run DDL/DML' },
            principal: { level: 'none', notes: 'Restricted for database integrity' },
            instructor: { level: 'none', notes: 'Strictly restricted to prevent accidental data changes' },
            lab_assistant: { level: 'none', notes: 'No database console access' },
            student: { level: 'none', notes: 'No database console access' },
            parent: { level: 'none', notes: 'No database console access' },
            accountant: { level: 'none', notes: 'No database console access' }
        }
    },
    {
        route: '/admin/roles-permissions',
        label: 'Roles & Permissions Hub',
        category: 'ops',
        description: 'Central RBAC configuration manager and route access matrix.',
        access: {
            admin: { level: 'full', notes: 'Configure route permissions, audit role policies' },
            principal: { level: 'view', notes: 'Audit institutional access boundaries' },
            instructor: { level: 'none', notes: 'No permission administration access' },
            lab_assistant: { level: 'none', notes: 'No permission administration access' },
            student: { level: 'none', notes: 'No permission administration access' },
            parent: { level: 'none', notes: 'No permission administration access' },
            accountant: { level: 'none', notes: 'No permission administration access' }
        }
    }
];

export default function RolesPermissionsPage() {
    const [selectedRole, setSelectedRole] = useState('all');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [activeRouteDetail, setActiveRouteDetail] = useState(null);

    const filteredRoutes = useMemo(() => {
        return ROUTES_MATRIX.filter(item => {
            if (selectedCategory !== 'all' && item.category !== selectedCategory) {
                return false;
            }

            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchName = item.label.toLowerCase().includes(q);
                const matchRoute = item.route.toLowerCase().includes(q);
                const matchDesc = item.description.toLowerCase().includes(q);
                if (!matchName && !matchRoute && !matchDesc) return false;
            }

            return true;
        });
    }, [selectedCategory, searchQuery]);

    const renderAccessPill = (level, notes) => {
        switch (level) {
            case 'full':
                return (
                    <span
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                        title={notes}
                    >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        Full Access
                    </span>
                );
            case 'view':
                return (
                    <span
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                        title={notes}
                    >
                        <Eye className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        Supervisory
                    </span>
                );
            case 'scoped':
                return (
                    <span
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                        title={notes}
                    >
                        <Shield className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        Scoped
                    </span>
                );
            case 'none':
            default:
                return (
                    <span
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700 opacity-60"
                        title={notes}
                    >
                        <Lock className="w-3.5 h-3.5 text-slate-400" />
                        No Access
                    </span>
                );
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-16">
            <PageHeader
                title="Role-Based Access Control (RBAC) & Page Matrix"
                titleHindi="भूमिका आधारित पृष्ठ अभिगम एवं अनुमति तालिका"
                backLink="/dashboard"
            />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
                {/* Intro Hero Banner */}
                <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="space-y-2 max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-bold uppercase tracking-wider backdrop-blur-md border border-white/20">
                            <Shield className="w-3.5 h-3.5 text-emerald-400" />
                            Institutional Security Matrix
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                            Page-Level Role Access & Privilege Policies
                        </h2>
                        <p className="text-slate-300 text-sm leading-relaxed">
                            Defines which functional routes, modules, and API capabilities are permitted for each of the 7 system roles. Integrated with the AI Chatbot for instant natural language policy queries.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 w-full md:w-auto shrink-0">
                        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10 text-center">
                            <span className="text-[10px] font-bold uppercase text-slate-400 block">Protected Routes</span>
                            <span className="text-2xl font-black text-white">{ROUTES_MATRIX.length}</span>
                        </div>
                        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10 text-center">
                            <span className="text-[10px] font-bold uppercase text-slate-400 block">Managed Roles</span>
                            <span className="text-2xl font-black text-emerald-400">{ROLES.length}</span>
                        </div>
                    </div>
                </div>

                {/* Role Overview Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {ROLES.map(role => (
                        <div
                            key={role.key}
                            onClick={() => setSelectedRole(selectedRole === role.key ? 'all' : role.key)}
                            className={`p-4 rounded-2xl border transition cursor-pointer ${
                                selectedRole === role.key
                                    ? 'bg-primary-50/80 dark:bg-primary-950/40 border-primary-500 ring-2 ring-primary-500/30'
                                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                            }`}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className={`px-2 py-0.5 rounded-lg text-xs font-bold border ${role.color}`}>
                                    {role.label}
                                </span>
                                <span className="text-xs font-mono text-slate-400">
                                    {role.count} users
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                                {role.desc}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Controls & Filter Bar */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
                    {/* Search */}
                    <div className="relative w-full md:w-80">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Filter page or route (/training, /quiz)..."
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-primary-500"
                        />
                    </div>

                    {/* Module Tabs */}
                    <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto custom-scrollbar">
                        {MODULE_CATEGORIES.map(cat => (
                            <button
                                key={cat.key}
                                type="button"
                                onClick={() => setSelectedCategory(cat.key)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                                    selectedCategory === cat.key
                                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                                }`}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Interactive Matrix Table */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-slate-100/70 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
                                    <th className="py-3.5 px-4 font-bold text-slate-700 dark:text-slate-300 w-64">
                                        Page / Route
                                    </th>
                                    {ROLES.filter(r => selectedRole === 'all' || selectedRole === r.key).map(role => (
                                        <th key={role.key} className="py-3.5 px-3 font-bold text-slate-700 dark:text-slate-300 text-center min-w-[120px]">
                                            <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${role.color}`}>
                                                {role.label}
                                            </span>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {filteredRoutes.map((row) => (
                                    <tr
                                        key={row.route}
                                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition group cursor-pointer"
                                        onClick={() => setActiveRouteDetail(row)}
                                    >
                                        <td className="py-3.5 px-4">
                                            <div className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                                                <span>{row.label}</span>
                                                <span className="font-mono text-[10px] text-slate-400 opacity-80">
                                                    {row.route}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                                                {row.description}
                                            </p>
                                        </td>

                                        {ROLES.filter(r => selectedRole === 'all' || selectedRole === r.key).map(role => {
                                            const roleAccess = row.access[role.key] || { level: 'none', notes: 'No explicit access rule' };
                                            return (
                                                <td key={role.key} className="py-3.5 px-3 text-center">
                                                    {renderAccessPill(roleAccess.level, roleAccess.notes)}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Route Detail Drawer / Modal */}
                {activeRouteDetail && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                        <div className="bg-white dark:bg-slate-900 max-w-xl w-full rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-5 shadow-2xl">
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                            {activeRouteDetail.label}
                                        </h3>
                                        <span className="font-mono text-xs text-primary-600 bg-primary-50 dark:bg-primary-950/40 px-2 py-0.5 rounded border border-primary-200">
                                            {activeRouteDetail.route}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">
                                        {activeRouteDetail.description}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setActiveRouteDetail(null)}
                                    className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1 custom-scrollbar">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                    Role Access Explanations
                                </h4>
                                {ROLES.map(role => {
                                    const acc = activeRouteDetail.access[role.key] || { level: 'none', notes: 'No access granted' };
                                    return (
                                        <div
                                            key={role.key}
                                            className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex items-start justify-between gap-3"
                                        >
                                            <div className="space-y-0.5">
                                                <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border ${role.color}`}>
                                                    {role.label}
                                                </span>
                                                <p className="text-xs text-slate-600 dark:text-slate-300">
                                                    {acc.notes}
                                                </p>
                                            </div>
                                            <div className="shrink-0">
                                                {renderAccessPill(acc.level, acc.notes)}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <button
                                type="button"
                                onClick={() => setActiveRouteDetail(null)}
                                className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 font-bold text-xs text-slate-800 dark:text-slate-200 transition"
                            >
                                Close Policy Detail
                            </button>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
