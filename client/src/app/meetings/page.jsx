'use client';

import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    Video, Calendar, Clock, User, Play, CheckCircle, XCircle,
    Plus, Search, X, Users, CalendarPlus, Award, Shield, Trash2, Sparkles,
    Link2, Copy, Check, Share2, Edit3, Lock, UserPlus, GraduationCap, CheckSquare, Square, Download
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { useConfirm } from '@/components/ConfirmDialog';
import { meetingAPI, classesAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import AssignmentCalendar from '@/components/AssignmentCalendar';
import { formatDate, formatDateTime, formatTime } from '@/lib/dateUtils';

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
        const scheduledTime = session?.scheduledAt ? formatDateTime(session.scheduledAt) : 'Now';
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
    const confirm = useConfirm();
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
    const [targetCategoryFilter, setTargetCategoryFilter] = useState('all'); // 'all', 'class', 'group', 'student'
    const [selectedTargets, setSelectedTargets] = useState([]); // array of { id, type, name, subtext }
    const [availableTargetResults, setAvailableTargetResults] = useState({ classes: [], groups: [], students: [] });
    const [loadingTargets, setLoadingTargets] = useState(false);
    const [targetSearchQuery, setTargetSearchQuery] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    
    // Edit Target Search states
    const [editTargetSearchQuery, setEditTargetSearchQuery] = useState('');
    const [editTargetType, setEditTargetType] = useState('all');
    const [editAvailableTargets, setEditAvailableTargets] = useState([]);
    const [editLoadingTargets, setEditLoadingTargets] = useState(false);

    const [scheduledDateTime, setScheduledDateTime] = useState('');
    const [duration, setDuration] = useState(15);
    const [sessionTitle, setSessionTitle] = useState('');
    const [autoAdmit, setAutoAdmit] = useState(true);
    const [scheduling, setScheduling] = useState(false);

    const [editingSession, setEditingSession] = useState(null);
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
        const ok = await confirm({
            title: 'Delete All Meetings & Recordings?',
            message: 'Are you sure you want to delete ALL meeting sessions and recording files? This action is permanent and cannot be undone.',
            confirmText: 'Delete All Meetings',
            cancelText: 'Cancel',
            type: 'danger',
        });
        if (!ok) return;

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
            // Strictly show sessions that have an uploaded recording
            const validRecordings = allSessions.filter(s => !!s.recordingUrl);
            setRecordings(validRecordings);
        } catch (error) {
            console.error('Error loading recordings:', error);
            toast.error('Failed to load recordings');
        } finally {
            setLoadingRecordings(false);
        }
    };

    const formatRecordingDuration = (seconds) => {
        if (!seconds && seconds !== 0) return null;
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        if (mins === 0) return `${secs}s`;
        if (secs === 0) return `${mins} min`;
        return `${mins}m ${secs}s`;
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

    const fetchPopulatedTargets = async (query = '') => {
        setLoadingTargets(true);
        try {
            const res = await meetingAPI.searchTargets({
                q: (query || '').trim(),
                type: 'all'
            });
            if (res.data?.success && res.data?.data) {
                setAvailableTargetResults({
                    classes: res.data.data.classes || [],
                    groups: res.data.data.groups || [],
                    students: res.data.data.students || []
                });
            }
        } catch (error) {
            console.error('Error searching targets:', error);
        } finally {
            setLoadingTargets(false);
        }
    };

    useEffect(() => {
        if (showScheduleModal) {
            const debounceTimer = setTimeout(() => {
                fetchPopulatedTargets(targetSearchQuery);
            }, targetSearchQuery ? 250 : 0);
            return () => clearTimeout(debounceTimer);
        }
    }, [targetSearchQuery, showScheduleModal]);

    const MAX_PARTICIPANT_CAPACITY = 50;

    // Set of selected class IDs
    const selectedClassIds = useMemo(() => {
        return new Set(selectedTargets.filter(t => t.type === 'class').map(t => t.id));
    }, [selectedTargets]);

    const selectedClassNames = useMemo(() => {
        return selectedTargets.filter(t => t.type === 'class').map(t => t.name);
    }, [selectedTargets]);

    // Total participants / students count in meeting bucket
    const totalParticipantCount = useMemo(() => {
        return selectedTargets.reduce((sum, item) => {
            const count = item.studentCount !== undefined ? item.studentCount : (item.type === 'student' ? 1 : 0);
            return sum + count;
        }, 0);
    }, [selectedTargets]);

    // Filter available groups: remove any groups that belong to an already selected class
    const visibleGroups = useMemo(() => {
        return (availableTargetResults.groups || []).filter(g => {
            const groupClassId = g.classId || g.class?.id;
            return !selectedClassIds.has(groupClassId);
        });
    }, [availableTargetResults.groups, selectedClassIds]);

    // Filter available students: remove any students enrolled in an already selected class
    const visibleStudents = useMemo(() => {
        return (availableTargetResults.students || []).filter(s => {
            const studentClassIds = (s.enrollments || []).map(e => e.classId || e.class?.id).filter(Boolean);
            return !studentClassIds.some(cid => selectedClassIds.has(cid));
        });
    }, [availableTargetResults.students, selectedClassIds]);

    const visibleClasses = availableTargetResults.classes || [];

    // Count how many groups/students are covered by selected classes
    const coveredGroupsCount = useMemo(() => {
        return (availableTargetResults.groups || []).length - visibleGroups.length;
    }, [availableTargetResults.groups, visibleGroups]);

    const coveredStudentsCount = useMemo(() => {
        return (availableTargetResults.students || []).length - visibleStudents.length;
    }, [availableTargetResults.students, visibleStudents]);

    const toggleTargetSelection = (targetItem) => {
        setSelectedTargets(prev => {
            const exists = prev.some(t => t.id === targetItem.id);
            if (exists) {
                return prev.filter(t => t.id !== targetItem.id);
            }

            // Target is a Class:
            if (targetItem.type === 'class') {
                const classStudentCount = targetItem.studentCount || 0;
                
                // Automatically remove any groups or students already selected that belong to this class
                const filtered = prev.filter(t => {
                    if (t.type === 'group' && (t.classId === targetItem.id)) return false;
                    if (t.type === 'student' && (t.classIds?.includes(targetItem.id) || t.classId === targetItem.id)) return false;
                    return true;
                });

                // Calculate current participant count without the subsumed items
                const currentParticipants = filtered.reduce((sum, item) => sum + (item.studentCount || (item.type === 'student' ? 1 : 0)), 0);

                if (currentParticipants + classStudentCount > MAX_PARTICIPANT_CAPACITY) {
                    toast.error(`Cannot select ${targetItem.name}: Adding ${classStudentCount} students exceeds maximum meeting capacity of ${MAX_PARTICIPANT_CAPACITY} participants (Current: ${currentParticipants}).`);
                    return prev;
                }

                const removedCount = prev.length - filtered.length;
                if (removedCount > 0) {
                    toast.success(`Selected ${targetItem.name} (${classStudentCount} students). Removed ${removedCount} covered group/student selections.`);
                }
                return [...filtered, targetItem];
            }

            // Target is a Group:
            if (targetItem.type === 'group') {
                const groupStudentCount = targetItem.studentCount || 0;
                const currentParticipants = prev.reduce((sum, item) => sum + (item.studentCount || (item.type === 'student' ? 1 : 0)), 0);

                if (currentParticipants + groupStudentCount > MAX_PARTICIPANT_CAPACITY) {
                    toast.error(`Cannot select ${targetItem.name}: Adding ${groupStudentCount} students exceeds maximum meeting capacity of ${MAX_PARTICIPANT_CAPACITY} participants (Current: ${currentParticipants}).`);
                    return prev;
                }
                return [...prev, targetItem];
            }

            // Target is a Student:
            if (targetItem.type === 'student') {
                const currentParticipants = prev.reduce((sum, item) => sum + (item.studentCount || (item.type === 'student' ? 1 : 0)), 0);
                if (currentParticipants + 1 > MAX_PARTICIPANT_CAPACITY) {
                    toast.error(`Cannot add student: Meeting participant capacity of ${MAX_PARTICIPANT_CAPACITY} students reached.`);
                    return prev;
                }
                return [...prev, targetItem];
            }

            return [...prev, targetItem];
        });
    };

    const removeSelectedTarget = (targetId) => {
        setSelectedTargets(prev => prev.filter(t => t.id !== targetId));
    };

    const selectAllFilteredTargets = () => {
        setSelectedTargets(prev => {
            let workingList = [...prev];
            let currentTotal = workingList.reduce((sum, item) => sum + (item.studentCount || (item.type === 'student' ? 1 : 0)), 0);
            let reachedMax = false;

            // 1. Add visible classes
            if (targetCategoryFilter === 'all' || targetCategoryFilter === 'class') {
                for (const c of visibleClasses) {
                    if (workingList.some(item => item.id === c.id)) continue;
                    const studentCount = c._count?.enrollments ?? c._count?.students ?? 0;
                    
                    // Remove any group/student from this class from working list
                    workingList = workingList.filter(t => {
                        if (t.type === 'group' && (t.classId === c.id)) return false;
                        if (t.type === 'student' && (t.classIds?.includes(c.id) || t.classId === c.id)) return false;
                        return true;
                    });
                    currentTotal = workingList.reduce((sum, item) => sum + (item.studentCount || (item.type === 'student' ? 1 : 0)), 0);

                    if (currentTotal + studentCount > MAX_PARTICIPANT_CAPACITY) {
                        reachedMax = true;
                        continue;
                    }

                    workingList.push({
                        id: c.id,
                        type: 'class',
                        name: c.name + (c.section ? ` (${c.section})` : ''),
                        studentCount,
                        subtext: `${studentCount} Students`
                    });
                    currentTotal += studentCount;
                }
            }

            // Update selected class ids for group & student filtering
            const activeClassIds = new Set(workingList.filter(t => t.type === 'class').map(t => t.id));

            // 2. Add visible groups
            if (targetCategoryFilter === 'all' || targetCategoryFilter === 'group') {
                for (const g of visibleGroups) {
                    if (workingList.some(item => item.id === g.id)) continue;
                    if (activeClassIds.has(g.classId || g.class?.id)) continue;
                    const studentCount = g._count?.members || 0;
                    if (currentTotal + studentCount > MAX_PARTICIPANT_CAPACITY) {
                        reachedMax = true;
                        continue;
                    }
                    const classInfo = g.class ? `Class ${g.class.name}${g.class.section ? ` (${g.class.section})` : ''} • ` : '';
                    workingList.push({
                        id: g.id,
                        type: 'group',
                        name: g.name,
                        classId: g.classId || g.class?.id,
                        studentCount,
                        subtext: `${classInfo}${studentCount} Members`
                    });
                    currentTotal += studentCount;
                }
            }

            // 3. Add visible students
            if (targetCategoryFilter === 'all' || targetCategoryFilter === 'student') {
                for (const s of visibleStudents) {
                    if (workingList.some(item => item.id === s.id)) continue;
                    const studentClassIds = (s.enrollments || []).map(e => e.classId || e.class?.id).filter(Boolean);
                    if (studentClassIds.some(cid => activeClassIds.has(cid))) continue;
                    if (currentTotal + 1 > MAX_PARTICIPANT_CAPACITY) {
                        reachedMax = true;
                        break;
                    }
                    const className = s.enrollments?.[0]?.class ? ` • ${s.enrollments[0].class.name} (${s.enrollments[0].class.section || ''})` : '';
                    workingList.push({
                        id: s.id,
                        type: 'student',
                        name: `${s.firstName || ''} ${s.lastName || ''}`.trim() || s.name,
                        classIds: studentClassIds,
                        studentCount: 1,
                        subtext: (s.studentId || s.admissionNumber || s.email || 'Student') + className
                    });
                    currentTotal += 1;
                }
            }

            if (reachedMax) {
                toast(`Added targets up to maximum capacity (${currentTotal}/${MAX_PARTICIPANT_CAPACITY} students).`, { icon: 'ℹ️' });
            }
            return workingList;
        });
    };

    const clearAllSelectedTargets = () => {
        setSelectedTargets([]);
    };

    const searchEditTargets = async (query, type) => {
        setEditLoadingTargets(true);
        try {
            const res = await meetingAPI.searchTargets({ q: query || '', type: type || 'all' });
            const data = res.data?.data || {};
            if (type === 'student') {
                setEditAvailableTargets(data.students || []);
            } else if (type === 'class') {
                setEditAvailableTargets(data.classes || []);
            } else if (type === 'group') {
                setEditAvailableTargets(data.groups || []);
            } else {
                setEditAvailableTargets([
                    ...(data.classes || []).map(c => ({ ...c, type: 'class' })),
                    ...(data.groups || []).map(g => ({ ...g, type: 'group' })),
                    ...(data.students || []).map(s => ({ ...s, type: 'student' }))
                ]);
            }
        } catch (error) {
            console.error('Error searching edit targets:', error);
            toast.error('Failed to search targets');
        } finally {
            setEditLoadingTargets(false);
        }
    };

    useEffect(() => {
        const debounceTimer = setTimeout(() => {
            if (editTargetSearchQuery) {
                searchEditTargets(editTargetSearchQuery, editTargetType);
            }
        }, 300);
        return () => clearTimeout(debounceTimer);
    }, [editTargetSearchQuery, editTargetType]);

    const handleOpenEditModal = (session) => {
        setEditingSession(session);
        setMeetingType(session.type || 'scheduled');
        setSessionTitle(session.title || '');
        setDuration(session.durationMinutes || 15);
        setAutoAdmit(session.autoAdmit ?? true);
        
        if (session.scheduledAt) {
            const d = new Date(session.scheduledAt);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const hours = String(d.getHours()).padStart(2, '0');
            const mins = String(d.getMinutes()).padStart(2, '0');
            setScheduledDateTime(`${year}-${month}-${day}T${hours}:${mins}`);
        } else {
            setScheduledDateTime(getMinDateTime());
        }

        if (session.questionsAsked?.assignedTargets && session.questionsAsked.assignedTargets.length > 0) {
            setSelectedTargets(session.questionsAsked.assignedTargets);
        } else {
            const fallback = [];
            if (session.targetStudent) fallback.push({ id: session.targetStudent.id, type: 'student', name: session.targetStudent.firstName + ' ' + session.targetStudent.lastName });
            else if (session.targetClass) fallback.push({ id: session.targetClass.id, type: 'class', name: session.targetClass.name, studentCount: 0 });
            else if (session.targetGroup) fallback.push({ id: session.targetGroup.id, type: 'group', name: session.targetGroup.name, studentCount: 0 });
            setSelectedTargets(fallback);
        }

        setTargetSearchQuery('');
        setAvailableTargetResults({ classes: [], groups: [], students: [] });
        setShowScheduleModal(true);
    };

    const handleScheduleSession = async () => {
        if (selectedTargets.length === 0) {
            toast.error('Please select at least one class, group, or student');
            return;
        }
        
        const payload = {
            type: meetingType,
            targets: selectedTargets,
            targetType: selectedTargets[0].type,
            targetId: selectedTargets[0].id,
            durationMinutes: duration,
            title: sessionTitle || (selectedTargets.length === 1 ? `Meeting with ${selectedTargets[0].name || 'Student'}` : 'Group Meeting Session'),
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
            if (editingSession) {
                await meetingAPI.updateSession(editingSession.id, payload);
                toast.success('Meeting session updated successfully!');
            } else {
                const res = await meetingAPI.scheduleStandaloneSession(payload);
                toast.success('Meeting session scheduled successfully!');
                if (meetingType === 'instant' && res.data?.data?.session?.id) {
                    router.push(`/meeting/${getRoomCode(res.data.data.session)}`);
                    return;
                }
            }
            
            setShowScheduleModal(false);
            resetModalState();
            loadSessions();
        } catch (error) {
            console.error('Error processing meeting:', error);
            toast.error(error.response?.data?.message || 'Failed to process meeting session');
        } finally {
            setScheduling(false);
        }
    };

    const resetModalState = () => {
        setSelectedTargets([]);
        setTargetSearchQuery('');
        setTargetCategoryFilter('all');
        setAvailableTargetResults({ classes: [], groups: [], students: [] });
        setScheduledDateTime('');
        setDuration(15);
        setSessionTitle('');
        setMeetingType('scheduled');
        setAutoAdmit(true);
        setEditingSession(null);
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
        if (!session) return false;
        if (session.status === 'completed' || session.status === 'cancelled') return true;
        const dur = session.durationMinutes || session.duration || 15;
        const now = new Date();

        if (session.status === 'in_progress') {
            const start = new Date(session.actualStartTime || session.scheduledAt || session.createdAt);
            const end = new Date(start.getTime() + dur * 60 * 1000);
            return now > end;
        }

        if (session.scheduledAt) {
            const startTime = new Date(session.scheduledAt);
            const endTime = new Date(startTime.getTime() + dur * 60 * 1000);
            return now > endTime;
        }

        return false;
    };

    // Helper to check if session should be live
    const isSessionLive = (session) => {
        if (!session) return false;
        if (session.status === 'completed' || session.status === 'cancelled') return false;

        const now = new Date();
        const dur = session.durationMinutes || session.duration || 15;

        if (session.status === 'in_progress') {
            const start = new Date(session.actualStartTime || session.scheduledAt || session.createdAt);
            const end = new Date(start.getTime() + dur * 60 * 1000);
            return now <= end;
        }

        if (session.status === 'scheduled') {
            const startTime = new Date(session.scheduledAt);
            const endTime = new Date(startTime.getTime() + dur * 60 * 1000);
            return now >= startTime && now <= endTime;
        }

        return false;
    };

    // Categorize sessions
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const liveSessions = sessions.filter(s => isSessionLive(s));
    const allScheduledSessions = sessions.filter(s => s.status === 'scheduled' && !isSessionLive(s) && !isSessionExpired(s));
    const pastSessions = sessions.filter(s => s.status === 'completed' || s.status === 'cancelled' || isSessionExpired(s));

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
                                            onEdit={handleOpenEditModal}
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
                                            onEdit={handleOpenEditModal}
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
                                            onEdit={handleOpenEditModal}
                                            onWatchRecording={setSelectedRecording}
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

                {/* Recordings Tab Content (Admin & Instructors) */}
                {activeTab === 'recordings' && canViewRecordings && (
                    <div className="space-y-6">
                        {/* Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="card p-4 bg-gradient-to-r from-primary-500 to-primary-600 text-white">
                                <div className="flex items-center gap-3">
                                    <Video className="w-8 h-8 opacity-80" />
                                    <div>
                                        <p className="text-2xl font-bold">{recordings.length}</p>
                                        <p className="text-sm opacity-80">Total Recordings</p>
                                    </div>
                                </div>
                            </div>
                            <div className="card p-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white">
                                <div className="flex items-center gap-3">
                                    <Clock className="w-8 h-8 opacity-80" />
                                    <div>
                                        <p className="text-2xl font-bold">
                                            {Math.round(recordings.reduce((sum, r) => sum + (r.recordingDuration || (r.durationMinutes ? r.durationMinutes * 60 : 0)), 0) / 60)} min
                                        </p>
                                        <p className="text-sm opacity-80">Total Duration</p>
                                    </div>
                                </div>
                            </div>
                            <div className="card p-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                                <div className="flex items-center gap-3">
                                    <Shield className="w-8 h-8 opacity-80" />
                                    <div>
                                        <p className="text-2xl font-bold">
                                            {formatFileSize(recordings.reduce((sum, r) => sum + (r.recordingSize || 0), 0))}
                                        </p>
                                        <p className="text-sm opacity-80">Storage Used</p>
                                    </div>
                                </div>
                            </div>
                            <div className="card p-4 bg-gradient-to-r from-purple-500 to-indigo-500 text-white">
                                <div className="flex items-center gap-3">
                                    <CheckCircle className="w-8 h-8 opacity-80" />
                                    <div>
                                        <p className="text-2xl font-bold">
                                            {recordings.filter(r => r.status === 'completed').length}
                                        </p>
                                        <p className="text-sm opacity-80">Completed Sessions</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Search Filter */}
                        <div className="card p-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search by meeting title, student, or host..."
                                    className="input pl-10 w-full"
                                    value={recordingSearch}
                                    onChange={(e) => setRecordingSearch(e.target.value)}
                                />
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
                                        if (!session.recordingUrl) return false;
                                        const titleMatch = (session.title || session.questionsAsked?.sessionTitle || session.submission?.assignment?.title || '')
                                            .toLowerCase().includes(recordingSearch.toLowerCase());
                                        const studentMatch = (session.targetStudent?.firstName || session.student?.firstName || '')
                                            .toLowerCase().includes(recordingSearch.toLowerCase()) ||
                                            (session.targetStudent?.lastName || session.student?.lastName || '')
                                            .toLowerCase().includes(recordingSearch.toLowerCase());
                                        const hostMatch = (session.host?.firstName || session.examiner?.firstName || '')
                                            .toLowerCase().includes(recordingSearch.toLowerCase()) ||
                                            (session.host?.lastName || session.examiner?.lastName || '')
                                            .toLowerCase().includes(recordingSearch.toLowerCase());
                                        return recordingSearch === '' || titleMatch || studentMatch || hostMatch;
                                    })
                                    .map((session) => (
                                        <div key={session.id} className="card p-5 hover:shadow-lg transition border-l-4 border-emerald-500">
                                            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                                                <div className="flex-1">
                                                    <div className="flex items-start gap-3">
                                                        <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-emerald-100 text-emerald-600 shrink-0">
                                                            <Video className="w-6 h-6" />
                                                        </div>
                                                        <div>
                                                            <h3 className="font-semibold text-slate-900 text-base">
                                                                {session.title || session.questionsAsked?.sessionTitle || session.submission?.assignment?.title || 'Meeting Session'}
                                                            </h3>
                                                            <div className="flex flex-wrap gap-3 text-sm text-slate-500 mt-1">
                                                                {(session.targetStudent || session.student) && (
                                                                    <span className="flex items-center gap-1">
                                                                        <User className="w-4 h-4" />
                                                                        Student: {(session.targetStudent || session.student).firstName} {(session.targetStudent || session.student).lastName}
                                                                    </span>
                                                                )}
                                                                {(session.host || session.examiner) && (
                                                                    <span className="flex items-center gap-1">
                                                                        <Shield className="w-4 h-4" />
                                                                        Host: {session.host ? `${session.host.firstName} ${session.host.lastName}` : `${session.examiner?.firstName} ${session.examiner?.lastName}`}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-wrap gap-4 mt-3 text-sm text-slate-500">
                                                        <span className="flex items-center gap-1">
                                                            <Calendar className="w-4 h-4" />
                                                            {formatDateTime(session.actualEndTime || session.updatedAt)}
                                                        </span>
                                                        <span className="flex items-center gap-1 text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                                            <Clock className="w-4 h-4 text-emerald-600" />
                                                            Recorded: {session.recordingDuration ? formatRecordingDuration(session.recordingDuration) : `${session.durationMinutes || 10} min`}
                                                        </span>
                                                        {session.recordingSize && (
                                                            <span className="text-slate-600">📁 {formatFileSize(session.recordingSize)}</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={() => setSelectedRecording(session)}
                                                        className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl transition shadow-sm flex items-center gap-2 font-semibold text-sm"
                                                        title="Watch Recording"
                                                    >
                                                        <Play className="w-4 h-4 fill-white" />
                                                        <span>Watch</span>
                                                    </button>
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
                    <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
                        <div className="p-4 border-b flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900">
                                    {selectedRecording.title || selectedRecording.questionsAsked?.sessionTitle || selectedRecording.submission?.assignment?.title || 'Meeting Recording'}
                                </h2>
                                <p className="text-sm text-slate-500">
                                    Host: {selectedRecording.host ? `${selectedRecording.host.firstName} ${selectedRecording.host.lastName}` : (selectedRecording.examiner ? `${selectedRecording.examiner.firstName} ${selectedRecording.examiner.lastName}` : 'Host')} • {formatDateTime(selectedRecording.actualEndTime || selectedRecording.updatedAt)}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <a
                                    href={selectedRecording.recordingUrl?.startsWith('http') || selectedRecording.recordingUrl?.startsWith('/api') ? selectedRecording.recordingUrl : `/api/meetings/recordings/${selectedRecording.recordingUrl?.split('/').pop()}`}
                                    download={selectedRecording.recordingUrl?.split('/').pop() || 'meeting_recording.webm'}
                                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                                    title="Download Video File"
                                >
                                    <Download className="w-4 h-4" /> Download
                                </a>
                                <button
                                    onClick={() => setSelectedRecording(null)}
                                    className="p-2 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg transition"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>
                        <div className="p-4 overflow-y-auto">
                            <video
                                controls
                                autoPlay
                                className="w-full rounded-lg bg-black aspect-video shadow-md"
                                src={selectedRecording.recordingUrl?.startsWith('http') || selectedRecording.recordingUrl?.startsWith('/api') ? selectedRecording.recordingUrl : `/api/meetings/recordings/${selectedRecording.recordingUrl?.split('/').pop()}`}
                            >
                                Your browser does not support video playback.
                            </video>
                            <div className="mt-4 bg-slate-50 rounded-xl p-4 border border-slate-200">
                                <h3 className="font-medium text-slate-900 mb-2">Session Details</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                    <div>
                                        <p className="text-slate-500 text-xs">Target / Student</p>
                                        <p className="font-medium mt-0.5">
                                            {selectedRecording.targetStudent ? `${selectedRecording.targetStudent.firstName} ${selectedRecording.targetStudent.lastName}` : (selectedRecording.student ? `${selectedRecording.student.firstName} ${selectedRecording.student.lastName}` : 'All Participants')}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-slate-500 text-xs">Recorded Duration</p>
                                        <p className="font-medium text-emerald-700 mt-0.5">
                                            {selectedRecording.recordingDuration ? formatRecordingDuration(selectedRecording.recordingDuration) : `${selectedRecording.durationMinutes} min`}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-slate-500 text-xs">File Size</p>
                                        <p className="font-medium mt-0.5">
                                            {formatFileSize(selectedRecording.recordingSize)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-slate-500 text-xs">Remarks</p>
                                        <p className="font-medium mt-0.5">{selectedRecording.examinerRemarks || 'None'}</p>
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
                                        <h2 className="text-xl font-semibold text-slate-900">{editingSession ? 'Edit Meeting Session' : 'Schedule Meeting Session'}</h2>
                                        <p className="text-sm text-slate-500 mt-1">{editingSession ? 'Update meeting participants and details' : 'Create a new meeting session'}</p>
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

                            {/* Multi-Target Participants Selection */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="block text-sm font-semibold text-slate-900">
                                        Choose Classes, Groups & Students <span className="text-red-500">*</span>
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={selectAllFilteredTargets}
                                            className="text-xs text-primary-600 hover:text-primary-800 font-semibold"
                                        >
                                            Select All
                                        </button>
                                        <span className="text-slate-300">|</span>
                                        <button
                                            type="button"
                                            onClick={clearAllSelectedTargets}
                                            className="text-xs text-slate-500 hover:text-slate-700"
                                        >
                                            Clear
                                        </button>
                                    </div>
                                </div>

                                {/* Category Tabs */}
                                <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
                                    {[
                                        { id: 'all', label: 'All', count: visibleClasses.length + visibleGroups.length + visibleStudents.length },
                                        { id: 'class', label: 'Classes', count: visibleClasses.length },
                                        { id: 'group', label: 'Groups', count: visibleGroups.length },
                                        { id: 'student', label: 'Students', count: visibleStudents.length }
                                    ].map(cat => (
                                        <button
                                            key={cat.id}
                                            type="button"
                                            onClick={() => setTargetCategoryFilter(cat.id)}
                                            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 ${
                                                targetCategoryFilter === cat.id
                                                    ? 'bg-white text-primary-600 shadow-sm'
                                                    : 'text-slate-600 hover:text-slate-900'
                                            }`}
                                        >
                                            <span>{cat.label}</span>
                                            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                                                targetCategoryFilter === cat.id ? 'bg-primary-50 text-primary-700' : 'bg-slate-200/80 text-slate-600'
                                            }`}>
                                                {cat.count}
                                            </span>
                                        </button>
                                    ))}
                                </div>

                                {/* Search Bar */}
                                <div className="relative">
                                    <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="text"
                                        value={targetSearchQuery}
                                        onChange={(e) => setTargetSearchQuery(e.target.value)}
                                        placeholder="Search by class name, group title, student name or ID..."
                                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                                    />
                                    {targetSearchQuery && (
                                        <button
                                            type="button"
                                            onClick={() => setTargetSearchQuery('')}
                                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>

                                {/* Selected Targets & Participant Bucket Capacity Bar */}
                                {selectedTargets.length > 0 && (
                                    <div className="space-y-2 bg-gradient-to-br from-primary-50/80 to-indigo-50/50 p-3.5 rounded-xl border border-primary-100 shadow-sm">
                                        <div className="flex items-center justify-between text-xs font-semibold text-primary-900">
                                            <div className="flex items-center gap-2">
                                                <span>Participant Bucket:</span>
                                                <span className="px-2 py-0.5 rounded-full bg-primary-100 text-primary-800 font-bold">
                                                    👥 {totalParticipantCount} / {MAX_PARTICIPANT_CAPACITY} Students
                                                </span>
                                                {totalParticipantCount >= MAX_PARTICIPANT_CAPACITY && (
                                                    <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-bold">
                                                        Capacity Full (50)
                                                    </span>
                                                )}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={clearAllSelectedTargets}
                                                className="text-[11px] text-red-500 hover:text-red-700 font-medium"
                                            >
                                                Clear all
                                            </button>
                                        </div>

                                        {/* Capacity Progress Bar */}
                                        <div className="w-full h-1.5 bg-slate-200/80 rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full transition-all duration-300 ${
                                                    totalParticipantCount >= MAX_PARTICIPANT_CAPACITY ? 'bg-amber-500' : 'bg-primary-600'
                                                }`}
                                                style={{ width: `${Math.min(100, (totalParticipantCount / MAX_PARTICIPANT_CAPACITY) * 100)}%` }}
                                            />
                                        </div>

                                        {/* Target Chips */}
                                        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pt-1">
                                            {selectedTargets.map((item) => (
                                                <span
                                                    key={item.id}
                                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-white text-slate-800 border border-primary-200 shadow-xs"
                                                >
                                                    <span>
                                                        {item.type === 'class' ? '🎓' : item.type === 'group' ? '👥' : '👤'} {item.name}
                                                    </span>
                                                    <span className="text-[10px] text-primary-600 bg-primary-50 px-1.5 py-0.2 rounded">
                                                        {item.type === 'class' ? `${item.studentCount || 0} stds` : item.type === 'group' ? `${item.studentCount || 0} mems` : '1 std'}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeSelectedTarget(item.id)}
                                                        className="p-0.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-red-500 transition"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Populated Target Lists */}
                                <div className="border border-slate-200 rounded-2xl max-h-60 overflow-y-auto divide-y divide-slate-100">
                                    {loadingTargets ? (
                                        <div className="flex items-center justify-center py-8 text-xs text-slate-400">
                                            <div className="animate-spin w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full mr-2" />
                                            Loading populated targets...
                                        </div>
                                    ) : (
                                        <>
                                            {/* Classes */}
                                            {(targetCategoryFilter === 'all' || targetCategoryFilter === 'class') && visibleClasses.length > 0 && (
                                                <div className="p-2 space-y-1">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-0.5">Classes ({visibleClasses.length})</p>
                                                    {visibleClasses.map(c => {
                                                        const isSelected = selectedTargets.some(t => t.id === c.id);
                                                        const studentCount = c._count?.enrollments ?? c._count?.students ?? 0;
                                                        return (
                                                            <div
                                                                key={c.id}
                                                                onClick={() => toggleTargetSelection({ 
                                                                    id: c.id, 
                                                                    type: 'class', 
                                                                    name: c.name + (c.section ? ` (${c.section})` : ''), 
                                                                    studentCount, 
                                                                    subtext: `${studentCount} Students` 
                                                                })}
                                                                className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition ${
                                                                    isSelected ? 'bg-primary-50 border border-primary-200' : 'hover:bg-slate-50'
                                                                }`}
                                                            >
                                                                <div className="flex items-center gap-2.5">
                                                                    <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">
                                                                        🎓
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-xs font-semibold text-slate-900">{c.name} {c.section && `(${c.section})`}</p>
                                                                        <p className="text-[10px] text-slate-500">{studentCount} Students enrolled {c.gradeLevel ? `• Grade ${c.gradeLevel}` : ''}</p>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[10px] text-indigo-700 bg-indigo-50 font-medium px-2 py-0.5 rounded-full">
                                                                        +{studentCount} seats
                                                                    </span>
                                                                    {isSelected ? <CheckSquare className="w-4 h-4 text-primary-600" /> : <Square className="w-4 h-4 text-slate-300" />}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {/* Groups */}
                                            {(targetCategoryFilter === 'all' || targetCategoryFilter === 'group') && (
                                                <div className="p-2 space-y-1">
                                                    <div className="flex items-center justify-between px-2 py-0.5">
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Study & Lab Groups ({visibleGroups.length})</p>
                                                        {coveredGroupsCount > 0 && (
                                                            <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-medium">
                                                                {coveredGroupsCount} covered by selected class
                                                            </span>
                                                        )}
                                                    </div>
                                                    {visibleGroups.map(g => {
                                                        const isSelected = selectedTargets.some(t => t.id === g.id);
                                                        const classLabel = g.class ? `Class ${g.class.name}${g.class.section ? ` (${g.class.section})` : ''} • ` : '';
                                                        const studentCount = g._count?.members || 0;
                                                        return (
                                                            <div
                                                                key={g.id}
                                                                onClick={() => toggleTargetSelection({ 
                                                                    id: g.id, 
                                                                    type: 'group', 
                                                                    name: g.name, 
                                                                    classId: g.classId || g.class?.id,
                                                                    studentCount, 
                                                                    subtext: `${classLabel}${studentCount} Members` 
                                                                })}
                                                                className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition ${
                                                                    isSelected ? 'bg-primary-50 border border-primary-200' : 'hover:bg-slate-50'
                                                                }`}
                                                            >
                                                                <div className="flex items-center gap-2.5">
                                                                    <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-bold">
                                                                        👥
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-xs font-semibold text-slate-900">{g.name}</p>
                                                                        <p className="text-[10px] text-slate-500">{classLabel}{studentCount} Members {g.description ? `• ${g.description}` : ''}</p>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[10px] text-purple-700 bg-purple-50 font-medium px-2 py-0.5 rounded-full">
                                                                        +{studentCount} seats
                                                                    </span>
                                                                    {isSelected ? <CheckSquare className="w-4 h-4 text-primary-600" /> : <Square className="w-4 h-4 text-slate-300" />}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                    {visibleGroups.length === 0 && availableTargetResults.groups.length > 0 && (
                                                        <div className="p-3 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
                                                            All groups in search results belong to currently selected class(es).
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Students */}
                                            {(targetCategoryFilter === 'all' || targetCategoryFilter === 'student') && (
                                                <div className="p-2 space-y-1">
                                                    <div className="flex items-center justify-between px-2 py-0.5">
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Students ({visibleStudents.length})</p>
                                                        {coveredStudentsCount > 0 && (
                                                            <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-medium">
                                                                {coveredStudentsCount} covered by selected class
                                                            </span>
                                                        )}
                                                    </div>
                                                    {visibleStudents.map(s => {
                                                        const isSelected = selectedTargets.some(t => t.id === s.id);
                                                        const sName = `${s.firstName || ''} ${s.lastName || ''}`.trim() || s.name || 'Student';
                                                        const studentClassIds = (s.enrollments || []).map(e => e.classId || e.class?.id).filter(Boolean);
                                                        const classInfo = s.enrollments?.[0]?.class ? ` • ${s.enrollments[0].class.name}${s.enrollments[0].class.section ? ` (${s.enrollments[0].class.section})` : ''}` : '';
                                                        const subtext = (s.studentId || s.admissionNumber || s.email || 'Student') + classInfo;
                                                        return (
                                                            <div
                                                                key={s.id}
                                                                onClick={() => toggleTargetSelection({ 
                                                                    id: s.id, 
                                                                    type: 'student', 
                                                                    name: sName, 
                                                                    classIds: studentClassIds,
                                                                    studentCount: 1, 
                                                                    subtext 
                                                                })}
                                                                className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition ${
                                                                    isSelected ? 'bg-primary-50 border border-primary-200' : 'hover:bg-slate-50'
                                                                }`}
                                                            >
                                                                <div className="flex items-center gap-2.5">
                                                                    <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">
                                                                        👤
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-xs font-semibold text-slate-900">{sName}</p>
                                                                        <p className="text-[10px] text-slate-500">{subtext}</p>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[10px] text-emerald-700 bg-emerald-50 font-medium px-2 py-0.5 rounded-full">
                                                                        +1 seat
                                                                    </span>
                                                                    {isSelected ? <CheckSquare className="w-4 h-4 text-primary-600" /> : <Square className="w-4 h-4 text-slate-300" />}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                    {visibleStudents.length === 0 && availableTargetResults.students.length > 0 && (
                                                        <div className="p-3 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
                                                            All students in search results are already covered by selected class(es).
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {visibleClasses.length === 0 && visibleGroups.length === 0 && visibleStudents.length === 0 && (
                                                <div className="py-8 text-center text-slate-400 text-xs">
                                                    {targetSearchQuery ? `No targets found matching "${targetSearchQuery}"` : 'No targets available'}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
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
                                disabled={scheduling || selectedTargets.length === 0 || (meetingType === 'scheduled' && !scheduledDateTime)}
                                className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
                            >
                                {scheduling ? (
                                    <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                                ) : (
                                    <>
                                        {meetingType === 'instant' ? <Video className="w-5 h-5" /> : <CalendarPlus className="w-5 h-5" />}
                                        {editingSession ? 'Update Session' : (meetingType === 'instant' ? 'Start Meeting Now' : 'Schedule Session')}
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
function SessionCard({ session, isInstructor, getStatusIcon, getStatusBadge, isLive, onEdit, onWatchRecording }) {
    const { roomCode, formattedCode, passcode, copied, copyLink, copyInvitation } = useMeetingLink(session);
    const isPastSession = session.status === 'completed' || session.status === 'cancelled' || session.status === 'missed';

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

                        {!isPastSession && (
                            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs">
                                <span className="font-mono font-bold text-primary-700 bg-primary-50 px-2 py-0.5 rounded-md border border-primary-200">
                                    ID: {formattedCode}
                                </span>
                                <span className="font-mono font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                                    Passcode: {passcode}
                                </span>
                            </div>
                        )}
                        <div className="flex flex-wrap gap-y-2 gap-x-4 mt-2.5 text-xs text-slate-500">
                            <span className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-primary-500" />
                                <span>{session.scheduledAt ? formatDateTime(session.scheduledAt) : 'Not scheduled'}</span>
                            </span>
                            <span className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                <span>
                                    {isPastSession && session.recordingDuration
                                        ? `${Math.floor(session.recordingDuration / 60)}m ${session.recordingDuration % 60}s`
                                        : `${session.durationMinutes} minutes`}
                                </span>
                            </span>
                            
                            {/* Host Details */}
                            <span className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 text-indigo-800 px-2 py-0.5 rounded-md">
                                <Shield className="w-3 h-3 text-indigo-600" />
                                <span>Host: <strong>{session.host ? `${session.host.firstName} ${session.host.lastName}` : (session.examiner ? `${session.examiner.firstName} ${session.examiner.lastName}` : 'Host')}</strong></span>
                                <span className="text-indigo-500 font-mono text-[11px]">(ID: {session.host?.id?.slice(0, 8) || session.hostId?.slice(0, 8) || 'N/A'})</span>
                            </span>

                            {/* Target Participant / Group / Class Details */}
                            {(session.targetStudent || session.student) && (
                                <span className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
                                    <User className="w-3 h-3 text-emerald-600" />
                                    <span>Participant: <strong>{(session.targetStudent || session.student).firstName} {(session.targetStudent || session.student).lastName}</strong></span>
                                    <span className="text-emerald-600 font-mono text-[11px]">
                                        (ID: {(session.targetStudent || session.student).admissionNumber || (session.targetStudent || session.student).studentId || (session.targetStudent || session.student).id?.slice(0, 8)})
                                    </span>
                                </span>
                            )}
                            {session.targetClass && (
                                <span className="flex items-center gap-1.5 bg-purple-50 border border-purple-100 text-purple-800 px-2 py-0.5 rounded-md">
                                    <Users className="w-3 h-3 text-purple-600" />
                                    <span>Target Class: <strong>{session.targetClass.name} {session.targetClass.section ? `(${session.targetClass.section})` : ''}</strong></span>
                                    <span className="text-purple-500 font-mono text-[11px]">(ID: {session.targetClass.id?.slice(0, 8)})</span>
                                </span>
                            )}
                            {session.targetGroup && (
                                <span className="flex items-center gap-1.5 bg-amber-50 border border-amber-100 text-amber-800 px-2 py-0.5 rounded-md">
                                    <Users className="w-3 h-3 text-amber-600" />
                                    <span>Target Group: <strong>{session.targetGroup.name}</strong></span>
                                    <span className="text-amber-600 font-mono text-[11px]">(ID: {session.targetGroup.id?.slice(0, 8)})</span>
                                </span>
                            )}
                            {!session.targetStudent && !session.student && !session.targetClass && !session.targetGroup && (
                                <span className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 text-slate-700 px-2 py-0.5 rounded-md">
                                    <Users className="w-3 h-3 text-slate-500" />
                                    <span>Participants: <strong>School-wide / Open Session</strong></span>
                                </span>
                            )}
                        </div>

                        {session.status === 'completed' && session.examinerRemarks && (
                            <div className="mt-2.5 p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-600">
                                <span className="font-semibold text-slate-700">Remarks:</span> {session.examinerRemarks}
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
                    {/* Copy Link & Invite Buttons: ONLY for scheduled or in_progress sessions (NEVER for past sessions) */}
                    {!isPastSession && (
                        <>
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
                        </>
                    )}

                    {/* Edit Scheduled Meeting Button (Admin / Instructor) */}
                    {session.status === 'scheduled' && isInstructor && (
                        <button
                            onClick={() => onEdit(session)}
                            className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
                            title="Edit scheduled meeting details"
                        >
                            <Edit3 className="w-4 h-4 text-slate-600" />
                            <span className="hidden md:inline">Edit</span>
                        </button>
                    )}

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
                            title="Re-join Meeting"
                        >
                            <Video className="w-4 h-4" />
                            <span>Re-join</span>
                        </Link>
                    )}

                    {/* Watch Recording for past completed meetings ONLY if recording exists */}
                    {isPastSession && session.recordingUrl && (
                        <button
                            onClick={() => onWatchRecording && onWatchRecording(session)}
                            className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-semibold transition shadow-sm flex items-center gap-1.5 whitespace-nowrap"
                            title="Watch Session Recording"
                        >
                            <Play className="w-4 h-4 fill-white" />
                            <span>Watch Recording</span>
                        </button>
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
