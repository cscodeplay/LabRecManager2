'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    Video, Calendar, Clock, User, Play, CheckCircle, XCircle,
    Plus, Search, X, Users, CalendarPlus, Award, Shield, Trash2, Sparkles,
    Link2, Copy, Check, Share2
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { meetingAPI, classesAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import AssignmentCalendar from '@/components/AssignmentCalendar';

import io from 'socket.io-client';


const getRoomCode = (session) => {
    if (!session) return '';
    if (session.questionsAsked?.roomCode) return session.questionsAsked.roomCode;
    if (session.meetingLink) {
        const parts = session.meetingLink.split('/');
        const last = parts[parts.length - 1];
        if (last && last.length >= 6) return last;
    }
    if (session.id) {
        const num = Math.abs(session.id.split('').reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) % 9000000000, 1000000000)).toString();
        return num;
    }
    return '';
};

const getFormattedRoomCode = (session) => {
    const code = getRoomCode(session);
    if (code.length === 10) {
        return `${code.slice(0, 3)}-${code.slice(3, 6)}-${code.slice(6)}`;
    }
    return code;
};

const getPasscode = (session) => {
    if (session?.questionsAsked?.passcode) return session.questionsAsked.passcode;
    if (!session?.id) return 'k8m2px9a';
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz';
    let code = '';
    let hash = session.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    for (let i = 0; i < 8; i++) {
        hash = (hash * 9301 + 49297) % 233280;
        code += chars.charAt(Math.floor((hash / 233280) * chars.length));
    }
    return code;
};

function useMeetingLink(session) {
    const [copied, setCopied] = useState(false);

    const roomCode = getRoomCode(session);
    const formattedCode = getFormattedRoomCode(session);
    const passcode = getPasscode(session);
    const title = session?.title || session?.questionsAsked?.sessionTitle || session?.submission?.assignment?.title || 'Meeting Session';
    const hostName = session?.host ? `${session.host.firstName} ${session.host.lastName}` : (session?.examiner ? `${session.examiner.firstName} ${session.examiner.lastName}` : 'Host');

    const getJoinUrl = () => {
        if (typeof window !== 'undefined') {
            return `${window.location.origin}/meeting/${roomCode}`;
        }
        return `https://lab-rec-client.onrender.com/meeting/${roomCode}`;
    };

    const copyLink = async (e) => {
        if (e) e.stopPropagation();
        const url = getJoinUrl();
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            toast.success(`Meeting link copied!`, { icon: '🔗' });
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            toast.error('Failed to copy link');
        }
    };

    const copyInvitation = async (e) => {
        if (e) e.stopPropagation();
        const url = getJoinUrl();
        const scheduledTime = session?.scheduledAt ? new Date(session.scheduledAt).toLocaleString() : 'Now';
        const inviteText = `Join Meeting Session: ${title}
Host: ${hostName}
Time: ${scheduledTime}
Meeting ID: ${formattedCode}
Passcode: ${passcode}
Direct Link: ${url}`;
        try {
            await navigator.clipboard.writeText(inviteText);
            setCopied(true);
            toast.success(`Full invitation copied!`, { icon: '📋' });
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            toast.error('Failed to copy invitation');
        }
    };

    return {
        roomCode,
        formattedCode,
        passcode,
        joinUrl: getJoinUrl(),
        copied,
        copyLink,
        copyInvitation
    };
}

export default function MeetingPage() {
    const router = useRouter();
    const { user, isAuthenticated, _hasHydrated, selectedSessionId } = useAuthStore();
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);

    // Tab state for Sessions vs Recordings
    const [activeTab, setActiveTab] = useState('sessions');

    // Recordings state
    const [recordings, setRecordings] = useState([]);
    const [loadingRecordings, setLoadingRecordings] = useState(false);
    const [recordingSearch, setRecordingSearch] = useState('');
    const [recordingFilter, setRecordingFilter] = useState('all');
    const [selectedRecording, setSelectedRecording] = useState(null);

    // Schedule modal state
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [meetingType, setMeetingType] = useState('scheduled'); // 'instant' or 'scheduled'
    const [targetType, setTargetType] = useState('student'); // 'student', 'class', 'group'
    const [selectedTarget, setSelectedTarget] = useState(null);
    const [availableTargets, setAvailableTargets] = useState([]);
    const [loadingTargets, setLoadingTargets] = useState(false);
    const [targetSearchQuery, setTargetSearchQuery] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [students, setStudents] = useState([]);
    const [loadingStudents, setLoadingStudents] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [scheduledDateTime, setScheduledDateTime] = useState('');
    const [duration, setDuration] = useState(15);
    const [sessionTitle, setSessionTitle] = useState('');
    const [autoAdmit, setAutoAdmit] = useState(true);
    const [scheduling, setScheduling] = useState(false);

    const isAdmin = user?.role === 'admin' || user?.role === 'principal';
    const isInstructor = user?.role === 'instructor' || user?.role === 'admin' || user?.role === 'lab_assistant';
    const canViewRecordings = isAdmin || isInstructor;

    useEffect(() => {
        if (!_hasHydrated) return;
        if (!isAuthenticated) {
            router.push('/login');
            return;
        }
        loadSessions();

        // Real-time socket listener for meeting sync across devices
        const socketUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        const socket = io(socketUrl, {
            path: '/socket.io',
            transports: ['websocket', 'polling']
        });

        socket.on('connect', () => {
            if (user?.id) {
                socket.emit('join-user', user.id);
            }
        });

        socket.on('meeting:created', () => {
            loadSessions();
        });

        socket.on('meetings:updated', () => {
            loadSessions();
        });

        socket.on('meeting:session-ended', () => {
            loadSessions();
        });

        // Polling fallback every 5 seconds for instant multi-device sync
        const pollInterval = setInterval(() => {
            loadSessions(true);
        }, 5000);

        return () => {
            socket.disconnect();
            clearInterval(pollInterval);
        };
    }, [isAuthenticated, _hasHydrated, selectedSessionId, user?.id]);

    // Load recordings when switching to recordings tab
    useEffect(() => {
        if (activeTab === 'recordings' && canViewRecordings) {
            loadRecordings();
        }
    }, [activeTab]);

    const handleClearAllMeetings = async () => {
        const confirmDelete = window.confirm('Are you sure you want to delete ALL meeting sessions and recording files? This cannot be undone.');
        if (!confirmDelete) return;

        try {
            const res = await meetingAPI.clearAllMeetings();
            toast.success(res.data?.message || 'All meetings and recordings deleted.');
            loadSessions();
            loadRecordings();
        } catch (error) {
            console.error('Clear meetings error:', error);
            toast.error(error.response?.data?.message || 'Failed to clear meetings');
        }
    };

    const handleCreateDemoTestMeeting = async () => {
        try {
            const res = await meetingAPI.createDemoTestMeeting();
            const session = res.data?.data?.session;
            toast.success('Demo test meeting created!', { icon: '✨' });
            loadSessions();
            if (session?.id) {
                router.push(`/meeting/${getRoomCode(session)}`);
            }
        } catch (error) {
            console.error('Create demo meeting error:', error);
            toast.error(error.response?.data?.message || 'Failed to create demo test meeting');
        }
    };

    const loadSessions = async (isBackground = false) => {
        try {
            const res = await meetingAPI.getSessions({ limit: 50 });
            setSessions(res.data.data.sessions || []);
        } catch (error) {
            if (!isBackground) console.error('Error loading meeting sessions:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadRecordings = async () => {
        setLoadingRecordings(true);
        try {
            const res = await meetingAPI.getSessions({ limit: 100 });
            const allSessions = res.data.data.sessions || [];
            // Show completed sessions or any session that has an uploaded recording
            const validRecordings = allSessions.filter(s => s.recordingUrl || s.status === 'completed');
            setRecordings(validRecordings);
        } catch (error) {
            console.error('Error loading recordings:', error);
            toast.error('Failed to load recordings');
        } finally {
            setLoadingRecordings(false);
        }
    };

    const formatFileSize = (bytes) => {
        if (!bytes) return 'N/A';
        const mb = bytes / (1024 * 1024);
        return `${mb.toFixed(2)} MB`;
    };

    const searchStudents = async (query) => {
        if (!query || query.length < 2) {
            setStudents([]);
            return;
        }

        setLoadingStudents(true);
        try {
            const res = await meetingAPI.getAvailableStudents({ search: query });
            setStudents(res.data.data.students || []);
        } catch (error) {
            console.error('Error searching students:', error);
            toast.error('Failed to search students');
        } finally {
            setLoadingStudents(false);
        }
    };

    useEffect(() => {
        const debounceTimer = setTimeout(() => {
            if (searchQuery) {
                searchStudents(searchQuery);
            }
        }, 300);

        return () => clearTimeout(debounceTimer);
    }, [searchQuery]);

    const searchTargets = async (query, type) => {
        if (!query || query.length < 2) {
            setAvailableTargets([]);
            return;
        }
        setLoadingTargets(true);
        try {
            if (type === 'student') {
                const res = await meetingAPI.getAvailableStudents({ search: query });
                setAvailableTargets(res.data.data.students || []);
            } else if (type === 'class') {
                // If API exists, use it. Otherwise placeholder search.
                const res = await classesAPI.getAll({ search: query });
                setAvailableTargets(res.data.data.classes || []);
            } else if (type === 'group') {
                setAvailableTargets([{ id: 'dummy-group', name: query + ' Group' }]);
            }
        } catch (error) {
            console.error('Error searching targets:', error);
            toast.error('Failed to search targets');
        } finally {
            setLoadingTargets(false);
        }
    };

    useEffect(() => {
        const debounceTimer = setTimeout(() => {
            if (targetSearchQuery) {
                searchTargets(targetSearchQuery, targetType);
            }
        }, 300);
        return () => clearTimeout(debounceTimer);
    }, [targetSearchQuery, targetType]);

    const handleScheduleSession = async () => {
        if (!selectedTarget) {
            toast.error(`Please select a ${targetType}`);
            return;
        }
        
        const payload = {
            type: meetingType,
            targetType,
            targetId: selectedTarget.id,
            durationMinutes: duration,
            title: sessionTitle || 'Meeting Session',
            autoAdmit
        };

        if (meetingType === 'scheduled') {
            if (!scheduledDateTime) {
                toast.error('Please select a date and time');
                return;
            }
            const scheduledDate = new Date(scheduledDateTime);
            if (scheduledDate <= new Date()) {
                toast.error('Scheduled time must be in the future');
                return;
            }
            payload.scheduledAt = scheduledDate.toISOString();
        }

        setScheduling(true);
        try {
            const res = await meetingAPI.scheduleStandaloneSession(payload);
            toast.success('Meeting session scheduled successfully!');
            setShowScheduleModal(false);
            resetModalState();
            
            if (meetingType === 'instant' && res.data?.data?.session?.id) {
                router.push(`/meeting/${getRoomCode(res.data.data.session)}`);
            } else {
                loadSessions();
            }
        } catch (error) {
            console.error('Error scheduling meeting:', error);
            toast.error(error.response?.data?.message || 'Failed to schedule meeting session');
        } finally {
            setScheduling(false);
        }
    };

    const resetModalState = () => {
        setSelectedTarget(null);
        setTargetSearchQuery('');
        setAvailableTargets([]);
        setScheduledDateTime('');
        setDuration(15);
        setSessionTitle('');
        setMeetingType('scheduled');
        setTargetType('student');
        setAutoAdmit(true);
    };

    const getStatusBadge = (status) => {
        const styles = {
            scheduled: 'badge-primary',
            in_progress: 'badge-warning',
            completed: 'badge-success',
            cancelled: 'badge-danger',
            no_show: 'badge-danger'
        };
        return styles[status] || 'badge-secondary';
    };

    const getStatusIcon = (status) => {
        const icons = {
            scheduled: <Clock className="w-5 h-5 text-blue-500" />,
            in_progress: <Play className="w-5 h-5 text-amber-500" />,
            completed: <CheckCircle className="w-5 h-5 text-emerald-500" />,
            cancelled: <XCircle className="w-5 h-5 text-red-500" />
        };
        return icons[status] || <Video className="w-5 h-5 text-slate-500" />;
    };

    // Get minimum datetime (now + 5 minutes)
    const getMinDateTime = () => {
        const now = new Date();
        now.setMinutes(now.getMinutes() + 5);
        return now.toISOString().slice(0, 16);
    };

    // Helper to check if session time has expired
    const isSessionExpired = (session) => {
        if (!session.scheduledAt) return false;
        const startTime = new Date(session.scheduledAt);
        const endTime = new Date(startTime.getTime() + (session.durationMinutes || 15) * 60 * 1000);
        return new Date() > endTime;
    };

    // Helper to check if session should be live
    const isSessionLive = (session) => {
        if (session.status === 'in_progress') return true;
        if (session.status !== 'scheduled') return false;

        const now = new Date();
        const startTime = new Date(session.scheduledAt);
        const endTime = new Date(startTime.getTime() + (session.durationMinutes || 15) * 60 * 1000);

        // Live if: scheduled time passed but end time not passed
        return now >= startTime && now <= endTime;
    };

    // Categorize sessions
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const liveSessions = sessions.filter(s => isSessionLive(s));
    const allScheduledSessions = sessions.filter(s => s.status === 'scheduled' && !isSessionLive(s));
    const pastSessions = sessions.filter(s => s.status === 'completed' || s.status === 'cancelled');

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
                        <h1 className="text-xl font-semibold text-slate-900">Meeting Sessions</h1>
                    </div>

                    {/* Actions for Instructors / Admin */}
                    {isInstructor && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleClearAllMeetings}
                                className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-sm"
                                title="Delete All Meetings & Recordings"
                            >
                                <Trash2 className="w-4 h-4" />
                                <span>Clear All</span>
                            </button>

                            <button
                                onClick={handleCreateDemoTestMeeting}
                                className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-sm"
                                title="Create & Launch Demo Test Meeting"
                            >
                                <Sparkles className="w-4 h-4" />
                                <span>Create Demo Meeting</span>
                            </button>

                            <button
                                onClick={() => setShowScheduleModal(true)}
                                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-sm"
                                title="Schedule Meeting Session"
                            >
                                <CalendarPlus className="w-4 h-4" />
                                <span>Schedule Meeting</span>
                            </button>
                        </div>
                    )}
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-6">
                {/* Info Banner */}
                <div className="card p-6 mb-6 bg-gradient-to-r from-primary-500 to-accent-500 text-white">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                            <Video className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                            <h2 className="text-lg font-semibold">Online Meeting Sessions</h2>
                            <p className="text-white/80 mt-1">
                                {isInstructor
                                    ? 'Schedule and conduct meeting sessions with your students. Click "Schedule Meeting Session" to create a new session with video/audio call support.'
                                    : 'View your scheduled meeting sessions and join when it\'s time. Video and audio are off by default for privacy.'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Device Setup Reminder */}
                <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                            <Video className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                            <p className="font-medium text-amber-800">📱 Before joining a meeting session</p>
                            <p className="text-sm text-amber-600">Test your camera and microphone in Settings → Devices</p>
                        </div>
                    </div>
                    <Link href="/settings?tab=devices" className="btn btn-secondary text-sm whitespace-nowrap">
                        Test Devices
                    </Link>
                </div>

                {/* Calendar View */}
                <div className="mb-6">
                    <AssignmentCalendar />
                </div>

                {/* In-Progress Meeting Live Alert Banner */}
                {liveSessions.length > 0 && (
                    <div className="mb-6 p-5 bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 rounded-2xl text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-4 animate-in fade-in">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center animate-pulse">
                                <Video className="w-7 h-7 text-white" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                                    <span className="text-xs font-bold uppercase tracking-wider bg-black/30 px-2 py-0.5 rounded-md">
                                        Active Live Session
                                    </span>
                                </div>
                                <h3 className="text-lg font-bold mt-1">
                                    {liveSessions[0].title || liveSessions[0].submission?.assignment?.title || 'Live Meeting Session'}
                                </h3>
                                <p className="text-xs text-white/80">
                                    Room: <strong className="font-mono text-white">{liveSessions[0].id}</strong> • Click below to join and sync seamlessly from this device.
                                </p>
                            </div>
                        </div>
                        <Link
                            href={`/meeting/${liveSessions[0].id}`}
                            className="w-full md:w-auto px-6 py-3 bg-white text-red-600 font-bold rounded-xl shadow-lg hover:bg-slate-100 transition flex items-center justify-center gap-2 whitespace-nowrap"
                        >
                            <Play className="w-5 h-5 fill-red-600" />
                            Join Session on this Device
                        </Link>
                    </div>
                )}

                {/* Tab Navigation (Sessions / Recordings) */}
                {canViewRecordings && (
                    <div className="flex gap-2 mb-6">
                        <button
                            onClick={() => setActiveTab('sessions')}
                            className={`px-6 py-3 rounded-xl font-medium transition-all ${activeTab === 'sessions'
                                ? 'bg-primary-500 text-white shadow-lg'
                                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                                }`}
                        >
                            <span className="flex items-center gap-2">
                                <CalendarPlus className="w-5 h-5" />
                                Sessions
                            </span>
                        </button>
                        <button
                            onClick={() => setActiveTab('recordings')}
                            className={`px-6 py-3 rounded-xl font-medium transition-all ${activeTab === 'recordings'
                                ? 'bg-primary-500 text-white shadow-lg'
                                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                                }`}
                        >
                            <span className="flex items-center gap-2">
                                <Play className="w-5 h-5" />
                                Recordings
                            </span>
                        </button>
                    </div>
                )}

                {/* Sessions Tab Content */}
                {activeTab === 'sessions' && (
                    <>
                        {/* Live Sessions */}
                        {liveSessions.length > 0 && (
                            <div className="mb-8">
                                <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                    <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
                                    Live Now ({liveSessions.length})
                                </h2>
                                <div className="grid gap-4">
                                    {liveSessions.map((session) => (
                                        <SessionCard
                                            key={session.id}
                                            session={session}
                                            isInstructor={isInstructor}
                                            getStatusIcon={getStatusIcon}
                                            getStatusBadge={getStatusBadge}
                                            isLive={true}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Scheduled & Upcoming Sessions */}
                        {allScheduledSessions.length > 0 && (
                            <div className="mb-8">
                                <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                    <Calendar className="w-5 h-5 text-primary-600" />
                                    Scheduled & Upcoming Sessions ({allScheduledSessions.length})
                                </h2>
                                <div className="grid gap-4">
                                    {allScheduledSessions.map((session) => (
                                        <SessionCard
                                            key={session.id}
                                            session={session}
                                            isInstructor={isInstructor}
                                            getStatusIcon={getStatusIcon}
                                            getStatusBadge={getStatusBadge}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Past Sessions */}
                        {pastSessions.length > 0 && (
                            <div className="mb-8">
                                <h2 className="text-lg font-semibold text-slate-700 mb-4">Past Sessions</h2>
                                <div className="grid gap-4">
                                    {pastSessions.map((session) => (
                                        <SessionCard
                                            key={session.id}
                                            session={session}
                                            isInstructor={isInstructor}
                                            getStatusIcon={getStatusIcon}
                                            getStatusBadge={getStatusBadge}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Empty State */}
                        {sessions.length === 0 && (
                            <div className="card p-12 text-center">
                                <Video className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                                <h3 className="text-lg font-medium text-slate-700 mb-2">No meeting sessions</h3>
                                <p className="text-slate-500 mb-6">
                                    {isInstructor
                                        ? 'Get started by scheduling your first meeting session with a student.'
                                        : 'You don\'t have any scheduled meeting sessions at the moment.'}
                                </p>
                                {isInstructor && (
                                    <button
                                        onClick={() => setShowScheduleModal(true)}
                                        className="btn btn-primary inline-flex items-center gap-2"
                                    >
                                        <CalendarPlus className="w-5 h-5" />
                                        Schedule Your First Meeting
                                    </button>
                                )}
                            </div>
                        )}
                    </>
                )}

                {/* Recordings Tab Content (Admin Only) */}
                {activeTab === 'recordings' && isAdmin && (
                    <div className="space-y-6">
                        {/* Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="card p-4 bg-gradient-to-r from-primary-500 to-primary-600 text-white">
                                <div className="flex items-center gap-3">
                                    <Video className="w-8 h-8 opacity-80" />
                                    <div>
                                        <p className="text-2xl font-bold">{recordings.length}</p>
                                        <p className="text-sm opacity-80">Total Sessions</p>
                                    </div>
                                </div>
                            </div>
                            <div className="card p-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white">
                                <div className="flex items-center gap-3">
                                    <Play className="w-8 h-8 opacity-80" />
                                    <div>
                                        <p className="text-2xl font-bold">{recordings.filter(r => r.recordingUrl).length}</p>
                                        <p className="text-sm opacity-80">With Recordings</p>
                                    </div>
                                </div>
                            </div>
                            <div className="card p-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                                <div className="flex items-center gap-3">
                                    <Shield className="w-8 h-8 opacity-80" />
                                    <div>
                                        <p className="text-2xl font-bold">{recordings.filter(r => !r.recordingUrl).length}</p>
                                        <p className="text-sm opacity-80">Missing Recordings</p>
                                    </div>
                                </div>
                            </div>
                            <div className="card p-4 bg-gradient-to-r from-purple-500 to-indigo-500 text-white">
                                <div className="flex items-center gap-3">
                                    <Award className="w-8 h-8 opacity-80" />
                                    <div>
                                        <p className="text-2xl font-bold">
                                            {recordings.length > 0
                                                ? (recordings.reduce((sum, r) => sum + (parseFloat(r.marksObtained) || 0), 0) / recordings.length).toFixed(1)
                                                : 0}
                                        </p>
                                        <p className="text-sm opacity-80">Avg Marks</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Filters */}
                        <div className="card p-4">
                            <div className="flex flex-col md:flex-row gap-4">
                                <div className="flex-1 relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Search by student or examiner..."
                                        className="input pl-10 w-full"
                                        value={recordingSearch}
                                        onChange={(e) => setRecordingSearch(e.target.value)}
                                    />
                                </div>
                                <select
                                    className="input"
                                    value={recordingFilter}
                                    onChange={(e) => setRecordingFilter(e.target.value)}
                                >
                                    <option value="all">All Sessions</option>
                                    <option value="with_recording">With Recording</option>
                                    <option value="without_recording">Missing Recording</option>
                                </select>
                            </div>
                        </div>

                        {/* Recordings List */}
                        {loadingRecordings ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full"></div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {recordings
                                    .filter(session => {
                                        const searchMatch = recordingSearch === '' ||
                                            session.student?.firstName?.toLowerCase().includes(recordingSearch.toLowerCase()) ||
                                            session.student?.lastName?.toLowerCase().includes(recordingSearch.toLowerCase()) ||
                                            session.examiner?.firstName?.toLowerCase().includes(recordingSearch.toLowerCase()) ||
                                            session.examiner?.lastName?.toLowerCase().includes(recordingSearch.toLowerCase());
                                        let recordingMatch = true;
                                        if (recordingFilter === 'with_recording') recordingMatch = !!session.recordingUrl;
                                        if (recordingFilter === 'without_recording') recordingMatch = !session.recordingUrl;
                                        return searchMatch && recordingMatch;
                                    })
                                    .map((session) => (
                                        <div key={session.id} className={`card p-5 hover:shadow-lg transition ${!session.recordingUrl ? 'border-l-4 border-amber-500' : 'border-l-4 border-emerald-500'}`}>
                                            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                                                <div className="flex-1">
                                                    <div className="flex items-start gap-3">
                                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${session.recordingUrl ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                                                            <Video className="w-6 h-6" />
                                                        </div>
                                                        <div>
                                                            <h3 className="font-semibold text-slate-900">Meeting Session</h3>
                                                            <div className="flex flex-wrap gap-3 text-sm text-slate-500 mt-1">
                                                                <span className="flex items-center gap-1">
                                                                    <User className="w-4 h-4" />
                                                                    Student: {session.student?.firstName} {session.student?.lastName}
                                                                </span>
                                                                <span className="flex items-center gap-1">
                                                                    <Shield className="w-4 h-4" />
                                                                    Examiner: {session.examiner?.firstName} {session.examiner?.lastName}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-wrap gap-4 mt-3 text-sm text-slate-500">
                                                        <span className="flex items-center gap-1">
                                                            <Calendar className="w-4 h-4" />
                                                            {new Date(session.actualEndTime || session.updatedAt).toLocaleDateString()}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="w-4 h-4" />
                                                            {session.durationMinutes} min
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <Award className="w-4 h-4" />
                                                            {session.marksObtained}/{session.maxMarks} marks
                                                        </span>
                                                        {session.recordingSize && (
                                                            <span className="text-emerald-600">📁 {formatFileSize(session.recordingSize)}</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    {session.recordingUrl ? (
                                                        <button
                                                            onClick={() => setSelectedRecording(session)}
                                                            className="p-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl transition shadow-sm"
                                                            title="Watch Recording"
                                                        >
                                                            <Play className="w-5 h-5" />
                                                        </button>
                                                    ) : (
                                                        <span className="px-4 py-2 bg-amber-100 text-amber-700 rounded-lg text-sm font-medium">
                                                            No Recording
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                {recordings.length === 0 && (
                                    <div className="card p-12 text-center">
                                        <Video className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                                        <h3 className="text-lg font-medium text-slate-700">No recordings found</h3>
                                        <p className="text-slate-500">Completed meeting sessions with recordings will appear here</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* Video Player Modal for Recordings */}
            {selectedRecording && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
                        <div className="p-4 border-b flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900">
                                    Meeting Recording - {selectedRecording.student?.firstName} {selectedRecording.student?.lastName}
                                </h2>
                                <p className="text-sm text-slate-500">
                                    Host: {selectedRecording.host ? `${selectedRecording.host.firstName} ${selectedRecording.host.lastName}` : (selectedRecording.examiner ? `${selectedRecording.examiner.firstName} ${selectedRecording.examiner.lastName}` : 'Host')} •
                                    {new Date(selectedRecording.actualEndTime || selectedRecording.updatedAt).toLocaleDateString()}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedRecording(null)}
                                className="p-2 hover:bg-slate-100 rounded-lg transition"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="p-4">
                            <video
                                controls
                                autoPlay
                                className="w-full rounded-lg bg-black aspect-video"
                                src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api'}/meetings/recordings/${selectedRecording.recordingUrl?.split('/').pop()}`}
                            >
                                Your browser does not support video playback.
                            </video>
                            <div className="mt-4 bg-slate-50 rounded-lg p-4">
                                <h3 className="font-medium text-slate-900 mb-2">Session Details</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                    <div>
                                        <p className="text-slate-500">Student</p>
                                        <p className="font-medium">{selectedRecording.student?.firstName} {selectedRecording.student?.lastName}</p>
                                    </div>
                                    <div>
                                        <p className="text-slate-500">Marks</p>
                                        <p className="font-medium">{selectedRecording.marksObtained}/{selectedRecording.maxMarks}</p>
                                    </div>
                                    <div>
                                        <p className="text-slate-500">Duration</p>
                                        <p className="font-medium">{selectedRecording.durationMinutes} minutes</p>
                                    </div>
                                    <div>
                                        <p className="text-slate-500">Remarks</p>
                                        <p className="font-medium">{selectedRecording.examinerRemarks || 'No remarks'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}


            {showScheduleModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl z-10">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
                                        <CalendarPlus className="w-5 h-5 text-primary-600" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-semibold text-slate-900">Schedule Meeting Session</h2>
                                        <p className="text-sm text-slate-500">Create a new meeting session</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        setShowScheduleModal(false);
                                        resetModalState();
                                    }}
                                    className="p-2 hover:bg-slate-100 rounded-lg transition"
                                    title="Close"
                                >
                                    <X className="w-5 h-5 text-slate-500" />
                                </button>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-6">
                            {/* Meeting Type */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Meeting Type <span className="text-red-500">*</span>
                                </label>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setMeetingType('scheduled')}
                                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition ${meetingType === 'scheduled' ? 'bg-primary-500 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                                    >
                                        Scheduled
                                    </button>
                                    <button
                                        onClick={() => setMeetingType('instant')}
                                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition ${meetingType === 'instant' ? 'bg-primary-500 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                                    >
                                        Instant Meeting
                                    </button>
                                </div>
                            </div>

                            {/* Session Title (Optional) */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Session Title (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={sessionTitle}
                                    onChange={(e) => setSessionTitle(e.target.value)}
                                    placeholder="e.g., Mid-term Meeting, Lab Experiment Review"
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                                />
                            </div>

                            {/* Target Type */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Target Type <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={targetType}
                                    onChange={(e) => {
                                        setTargetType(e.target.value);
                                        setSelectedTarget(null);
                                        setAvailableTargets([]);
                                        setTargetSearchQuery('');
                                    }}
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                                >
                                    <option value="student">Student</option>
                                    <option value="class">Class</option>
                                    <option value="group">Group</option>
                                </select>
                            </div>

                            {/* Target Selection */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Select {targetType.charAt(0).toUpperCase() + targetType.slice(1)} <span className="text-red-500">*</span>
                                </label>

                                {selectedTarget ? (
                                    <div className="flex items-center justify-between p-4 bg-primary-50 border border-primary-200 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-primary-500 text-white flex items-center justify-center font-medium">
                                                {selectedTarget.firstName?.[0] || selectedTarget.name?.[0] || targetType[0].toUpperCase()}
                                                {selectedTarget.lastName?.[0]}
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-900">
                                                    {selectedTarget.firstName ? `${selectedTarget.firstName} ${selectedTarget.lastName}` : selectedTarget.name}
                                                </p>
                                                <p className="text-sm text-slate-500">
                                                    {selectedTarget.studentId || selectedTarget.email || `${targetType} ID`}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setSelectedTarget(null)}
                                            className="text-primary-600 hover:text-primary-800 text-sm font-medium"
                                        >
                                            Change
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="relative">
                                            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                                            <input
                                                type="text"
                                                value={targetSearchQuery}
                                                onChange={(e) => setTargetSearchQuery(e.target.value)}
                                                placeholder={`Search ${targetType}...`}
                                                className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                                            />
                                        </div>

                                        {loadingTargets && (
                                            <div className="flex items-center justify-center py-4">
                                                <div className="animate-spin w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full"></div>
                                            </div>
                                        )}

                                        {!loadingTargets && availableTargets.length > 0 && (
                                            <div className="border border-slate-200 rounded-xl max-h-48 overflow-y-auto">
                                                {availableTargets.map((target) => (
                                                    <button
                                                        key={target.id}
                                                        onClick={() => {
                                                            setSelectedTarget(target);
                                                            setTargetSearchQuery('');
                                                            setAvailableTargets([]);
                                                        }}
                                                        className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 transition border-b border-slate-100 last:border-0"
                                                    >
                                                        <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-sm font-medium">
                                                            {target.firstName?.[0] || target.name?.[0] || targetType[0].toUpperCase()}{target.lastName?.[0]}
                                                        </div>
                                                        <div className="text-left flex-1">
                                                            <div className="font-medium text-slate-900 text-sm">
                                                                {target.firstName ? `${target.firstName} ${target.lastName}` : target.name}
                                                            </div>
                                                            <p className="text-xs text-slate-500">
                                                                {target.studentId || target.admissionNumber || target.email || ''}
                                                            </p>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        {!loadingTargets && targetSearchQuery.length >= 2 && availableTargets.length === 0 && (
                                            <p className="text-sm text-slate-500 text-center py-4">
                                                No matches found for "{targetSearchQuery}"
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Date and Time (Only for scheduled) */}
                            {meetingType === 'scheduled' && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Date & Time <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={scheduledDateTime}
                                        onChange={(e) => setScheduledDateTime(e.target.value)}
                                        min={getMinDateTime()}
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                                    />
                                </div>
                            )}

                            {/* Duration */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Duration
                                </label>
                                <div className="flex gap-2">
                                    {[10, 15, 20, 30, 45, 60].map((mins) => (
                                        <button
                                            key={mins}
                                            onClick={() => setDuration(mins)}
                                            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition ${duration === mins ? 'bg-primary-500 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                                        >
                                            {mins} min
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Auto-Join & Bypass Waiting Room Checkbox */}
                            <div className="pt-1">
                                <label className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100 transition">
                                    <input
                                        type="checkbox"
                                        checked={autoAdmit}
                                        onChange={(e) => setAutoAdmit(e.target.checked)}
                                        className="mt-0.5 w-4 h-4 text-primary-600 rounded border-slate-300 focus:ring-primary-500"
                                    />
                                    <div>
                                        <span className="text-sm font-medium text-slate-900 block">Auto-join & Bypass Waiting Room</span>
                                        <span className="text-xs text-slate-500">Allow participants to join meeting directly without waiting for host approval</span>
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex gap-3 justify-end">
                            <button
                                onClick={() => {
                                    setShowScheduleModal(false);
                                    resetModalState();
                                }}
                                className="p-3 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition"
                                title="Cancel"
                            >
                                <X className="w-5 h-5" />
                            </button>
                            <button
                                onClick={handleScheduleSession}
                                disabled={scheduling || !selectedTarget || (meetingType === 'scheduled' && !scheduledDateTime)}
                                className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
                            >
                                {scheduling ? (
                                    <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                                ) : (
                                    <>
                                        {meetingType === 'instant' ? <Video className="w-5 h-5" /> : <CalendarPlus className="w-5 h-5" />}
                                        {meetingType === 'instant' ? 'Start Meeting Now' : 'Schedule Session'}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Session Card Component
function SessionCard({ session, isInstructor, getStatusIcon, getStatusBadge, isLive }) {
    const { roomCode, formattedCode, passcode, copied, copyLink, copyInvitation } = useMeetingLink(session);

    return (
        <div className={`card card-hover p-6 ${isLive ? 'ring-2 ring-red-500 ring-opacity-50' : ''}`}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4 flex-1">
                    <div className={`w-12 h-12 rounded-xl ${isLive ? 'bg-red-100' : 'bg-slate-100'} flex items-center justify-center shrink-0`}>
                        {isLive ? (
                            <div className="relative">
                                <Video className="w-5 h-5 text-red-500" />
                                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
                            </div>
                        ) : (
                            getStatusIcon(session.status)
                        )}
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                            <span className={`badge ${getStatusBadge(session.status)}`}>
                                {session.status.replace('_', ' ')}
                            </span>
                            <span className="text-sm text-slate-500">
                                {session.mode}
                            </span>
                            {isLive && (
                                <span className="text-xs font-medium text-red-500 bg-red-50 px-2 py-1 rounded-full animate-pulse">
                                    LIVE NOW
                                </span>
                            )}
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900">
                            {session.title || session.questionsAsked?.sessionTitle || session.submission?.assignment?.title || 'Meeting Session'}
                        </h3>

                        <div className="flex flex-wrap items-center gap-3 mt-2 text-xs">
                            <span className="font-mono font-bold text-primary-700 bg-primary-50 px-2 py-0.5 rounded-md border border-primary-200">
                                ID: {formattedCode}
                            </span>
                            <span className="font-mono font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                                Passcode: {passcode}
                            </span>
                        </div>
                        <div className="flex flex-wrap gap-4 mt-2 text-sm text-slate-500">
                            <span className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {session.scheduledAt
                                    ? new Date(session.scheduledAt).toLocaleString()
                                    : 'Not scheduled'}
                            </span>
                            <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {session.durationMinutes} minutes
                            </span>
                            {isInstructor && session.student && (
                                <span className="flex items-center gap-1">
                                    <User className="w-4 h-4" />
                                    Participant: {session.student.firstName} {session.student.lastName}
                                </span>
                            )}
                            {!isInstructor && (session.host || session.examiner) && (
                                <span className="flex items-center gap-1">
                                    <User className="w-4 h-4" />
                                    Host: {session.host ? `${session.host.firstName} ${session.host.lastName}` : `${session.examiner?.firstName} ${session.examiner?.lastName}`}
                                </span>
                            )}
                        </div>

                        {session.status === 'completed' && session.marksObtained && (
                            <div className="mt-3 p-3 bg-emerald-50 rounded-lg">
                                <p className="text-emerald-700">
                                    <span className="font-medium">Marks:</span> {session.marksObtained} / {session.maxMarks}
                                </p>
                                {session.examinerRemarks && (
                                    <p className="text-sm text-emerald-600 mt-1">
                                        {session.examinerRemarks}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Countdown Timer for in_progress sessions */}
                        {session.status === 'in_progress' && session.actualStartTime && (
                            <CountdownTimer
                                startTime={session.actualStartTime}
                                durationMinutes={session.durationMinutes}
                            />
                        )}
                    </div>
                </div>

                {/* Action and Copiable Link Buttons */}
                <div className="flex items-center gap-2 self-end sm:self-center">
                    {/* Copy Link Button */}
                    <button
                        onClick={copyLink}
                        className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition shadow-sm ${
                            copied
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-600'
                                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                        }`}
                        title="Copy direct meeting join link"
                    >
                        {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Link2 className="w-4 h-4 text-primary-600" />}
                        <span className="hidden md:inline">{copied ? 'Copied' : 'Copy Link'}</span>
                    </button>

                    {/* Copy Full Invitation */}
                    <button
                        onClick={copyInvitation}
                        className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
                        title="Copy full meeting invitation with ID and passcode"
                    >
                        <Copy className="w-4 h-4 text-slate-600" />
                        <span className="hidden lg:inline">Invite</span>
                    </button>

                    {/* Launch / Join Action Buttons */}
                    {session.status === 'scheduled' && (
                        <Link
                            href={`/meeting/${roomCode}`}
                            className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-semibold transition shadow-sm flex items-center gap-1.5 whitespace-nowrap"
                            title={isInstructor ? 'Start Meeting' : 'Join Meeting'}
                        >
                            <Play className="w-4 h-4" />
                            <span>{isInstructor ? 'Start Meeting' : 'Join'}</span>
                        </Link>
                    )}

                    {session.status === 'in_progress' && (
                        <Link
                            href={`/meeting/${roomCode}`}
                            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-semibold transition shadow-sm flex items-center gap-1.5 whitespace-nowrap"
                            title={isInstructor ? 'Resume Meeting' : 'Rejoin'}
                        >
                            <Video className="w-4 h-4" />
                            <span>{isInstructor ? 'Resume' : 'Rejoin'}</span>
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
}

// Countdown Timer Component
function CountdownTimer({ startTime, durationMinutes }) {
    const [timeRemaining, setTimeRemaining] = useState('');
    const [isCompleted, setIsCompleted] = useState(false);

    useEffect(() => {
        const calculateRemaining = () => {
            const start = new Date(startTime);
            const endTime = new Date(start.getTime() + durationMinutes * 60 * 1000);
            const now = new Date();
            const diff = endTime - now;

            if (diff <= 0) {
                setIsCompleted(true);
                setTimeRemaining('00:00 (Duration Complete)');
            } else {
                setIsCompleted(false);
                const mins = Math.floor(diff / 60000);
                const secs = Math.floor((diff % 60000) / 1000);
                setTimeRemaining(`${mins}:${secs.toString().padStart(2, '0')}`);
            }
        };

        calculateRemaining();
        const interval = setInterval(calculateRemaining, 1000);
        return () => clearInterval(interval);
    }, [startTime, durationMinutes]);

    return (
        <div className={`mt-3 p-3 rounded-lg flex items-center gap-2 ${isCompleted ? 'bg-slate-100' : 'bg-amber-50'}`}>
            <Clock className={`w-4 h-4 ${isCompleted ? 'text-slate-500' : 'text-amber-500'}`} />
            <span className={`text-sm font-mono font-medium ${isCompleted ? 'text-slate-600' : 'text-amber-600'}`}>
                {isCompleted ? 'Slot: ' : 'Time Remaining: '}
                {timeRemaining}
            </span>
        </div>
    );
}
