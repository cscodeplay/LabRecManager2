'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
    Clock, Plus, Trash2, Save, RefreshCw, Users, BookOpen,
    ChevronLeft, ChevronRight, GripVertical, AlertCircle, CheckCircle,
    LayoutGrid, User, Calendar as CalendarIcon, Edit2, Play, Info, GanttChartSquare,
    Sparkles, CalendarDays, Check, Activity, PartyPopper
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { timetableAPI, classesAPI, calendarAPI } from '@/lib/api';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import PageHeader from '@/components/PageHeader';
import { useConfirm } from '@/components/ConfirmDialog';
import { formatDate, formatDateRange } from '@/lib/dateUtils';
import PeriodWorkLogModal from '@/components/PeriodWorkLogModal';
import AITimetableGeneratorModal from '@/components/AITimetableGeneratorModal';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const DAY_LABELS = { monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri', saturday: 'Sat' };
const DAY_LABELS_FULL = { monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday', thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday' };

const SLOT_TYPES = [
    { value: 'lecture', label: 'Lecture', color: 'bg-blue-100 text-blue-800 border-blue-200' },
    { value: 'lab', label: 'Lab', color: 'bg-purple-100 text-purple-800 border-purple-200' },
    { value: 'break_period', label: 'Break', color: 'bg-amber-100 text-amber-800 border-amber-200' },
    { value: 'assembly', label: 'Assembly', color: 'bg-teal-100 text-teal-800 border-teal-200' },
    { value: 'free', label: 'Free', color: 'bg-slate-100 text-slate-600 border-slate-200' },
    { value: 'sports', label: 'Sports', color: 'bg-green-100 text-green-800 border-green-200' },
    { value: 'library', label: 'Library', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
];

const DEFAULT_PERIODS = [
    { periodNumber: 1, startTime: '08:00', endTime: '08:40' },
    { periodNumber: 2, startTime: '08:40', endTime: '09:20' },
    { periodNumber: 3, startTime: '09:20', endTime: '10:00' },
    { periodNumber: 4, startTime: '10:00', endTime: '10:15', slotType: 'break_period' },
    { periodNumber: 5, startTime: '10:15', endTime: '10:55' },
    { periodNumber: 6, startTime: '10:55', endTime: '11:35' },
    { periodNumber: 7, startTime: '11:35', endTime: '12:15' },
    { periodNumber: 8, startTime: '12:15', endTime: '12:55' },
];

function getSlotColor(slotType) {
    return SLOT_TYPES.find(s => s.value === slotType)?.color || 'bg-slate-100 text-slate-600 border-slate-200';
}

export default function AdminTimetablePage() {
    const router = useRouter();
    const confirm = useConfirm();
    const { user, isAuthenticated, _hasHydrated, selectedSessionId } = useAuthStore();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    // Week & Calendar Navigation
    const [weekOffset, setWeekOffset] = useState(0);
    const [calendarHolidays, setCalendarHolidays] = useState({});
    const [loggedWorkMap, setLoggedWorkMap] = useState({});

    // Data
    const [classes, setClasses] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [instructors, setInstructors] = useState([]);
    const [selectedClassId, setSelectedClassId] = useState('');
    
    const [timetable, setTimetable] = useState(null);
    const [timetableHistory, setTimetableHistory] = useState([]); // For Timeline View
    const [slots, setSlots] = useState({});
    
    // View state
    const [viewMode, setViewMode] = useState('class'); // class, instructor, timeline
    const [selectedInstructorId, setSelectedInstructorId] = useState('');
    const [instructorSchedule, setInstructorSchedule] = useState(null);

    // Dynamic Periods state
    const [periodStructure, setPeriodStructure] = useState([...DEFAULT_PERIODS]);

    // Create / Edit Timetable modal
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createForm, setCreateForm] = useState({
        name: '',
        effectiveFrom: '',
        effectiveTo: '',
        numPeriods: 8,
        periods: [...DEFAULT_PERIODS]
    });

    // AI Generator Modal
    const [showAIGeneratorModal, setShowAIGeneratorModal] = useState(false);

    // Period Work Log Modal
    const [showWorkLogModal, setShowWorkLogModal] = useState(false);
    const [workLogData, setWorkLogData] = useState({
        period: null,
        slot: null,
        day: '',
        dateStr: ''
    });

    // Edit slot modal
    const [showSlotModal, setShowSlotModal] = useState(false);
    const [editingSlot, setEditingSlot] = useState(null);
    const [slotForm, setSlotForm] = useState({
        subjectId: '', instructorId: '', roomNumber: '', slotType: 'lecture',
        startTime: '', endTime: ''
    });

    // Edit Period Timings modal
    const [showPeriodModal, setShowPeriodModal] = useState(false);
    const [editingPeriod, setEditingPeriod] = useState(null);
    const [periodForm, setPeriodForm] = useState({ startTime: '', endTime: '', slotType: 'lecture' });

    const isAdmin = user?.role === 'admin' || user?.role === 'principal';

    // Compute dynamic week days with date formatting
    const weekDays = useMemo(() => {
        const today = new Date();
        const currentDay = today.getDay(); // 0 is Sunday, 1 is Monday
        const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
        const monday = new Date(today);
        monday.setDate(today.getDate() + distanceToMonday + weekOffset * 7);

        return DAYS.map((dayKey, idx) => {
            const d = new Date(monday);
            d.setDate(monday.getDate() + idx);
            const dateStr = d.toISOString().split('T')[0];
            const isTodayDate = d.toDateString() === today.toDateString();
            const formattedDate = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
            const fullDateDisplay = d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });

            return {
                dayKey,
                date: d,
                dateStr,
                formattedDate,
                fullDateDisplay,
                isToday: isTodayDate
            };
        });
    }, [weekOffset]);

    // Load School Calendar Holidays
    const loadCalendarHolidays = useCallback(async () => {
        try {
            if (weekDays.length === 0) return;
            const startDate = weekDays[0].dateStr;
            const endDate = weekDays[weekDays.length - 1].dateStr;
            const res = await calendarAPI.getEvents({ startDate, endDate });
            const events = res.data?.data?.events || [];
            const hMap = {};
            events.forEach(e => {
                if (e.isHoliday || e.eventType === 'holiday') {
                    const dateKey = new Date(e.date).toISOString().split('T')[0];
                    hMap[dateKey] = e;
                }
            });
            setCalendarHolidays(hMap);
        } catch (e) {
            console.warn('Failed to load calendar holidays:', e);
        }
    }, [weekDays]);

    useEffect(() => {
        loadCalendarHolidays();
    }, [loadCalendarHolidays]);

    useEffect(() => {
        if (!_hasHydrated) return;
        if (!isAuthenticated) { router.push('/login'); return; }
        if (!isAdmin) { router.push('/dashboard'); return; }
        loadInitialData();
    }, [isAuthenticated, _hasHydrated, isAdmin, selectedSessionId]);

    const loadInitialData = async () => {
        setLoading(true);
        try {
            const [classesRes, usersRes] = await Promise.all([
                classesAPI.getAll(),
                api.get('/users', { params: { role: 'instructor', limit: 200 } })
            ]);
            setClasses(classesRes.data.data.classes || []);
            setInstructors(usersRes.data.data.users || []);
        } catch (error) {
            console.error('Error loading data:', error);
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const loadTimetable = useCallback(async (classId) => {
        if (!classId) return;
        setLoading(true);
        try {
            // Get current active
            const res = await timetableAPI.get({ classId });
            const tt = res.data.data?.timetable;
            setTimetable(tt);
            
            // Get timeline history
            try {
                const histRes = await timetableAPI.getAll({ classId });
                setTimetableHistory(histRes.data.data?.timetables || []);
            } catch (e) {
                setTimetableHistory([]);
            }

            // Also load subjects for this class
            try {
                const subjectsRes = await api.get(`/subjects`, { params: { classId } });
                setSubjects(subjectsRes.data.data?.subjects || subjectsRes.data.data || []);
            } catch { setSubjects([]); }

            if (tt?.slots && tt.slots.length > 0) {
                const grouped = {};
                DAYS.forEach(day => { grouped[day] = {}; });
                tt.slots.forEach(slot => {
                    grouped[slot.dayOfWeek][slot.periodNumber] = slot;
                });
                setSlots(grouped);
                
                // Build complete period structure ensuring periods 1 to max(8, maxPeriod) are ALWAYS present!
                const maxPeriod = Math.max(8, ...tt.slots.map(s => s.periodNumber || 1));
                const completePeriods = [];
                for (let pNum = 1; pNum <= maxPeriod; pNum++) {
                    const existingSlot = tt.slots.find(s => s.periodNumber === pNum);
                    const defaultP = DEFAULT_PERIODS[pNum - 1] || {
                        periodNumber: pNum,
                        startTime: '08:00',
                        endTime: '08:40',
                        slotType: 'lecture'
                    };
                    completePeriods.push({
                        periodNumber: pNum,
                        startTime: existingSlot?.startTime || defaultP.startTime,
                        endTime: existingSlot?.endTime || defaultP.endTime,
                        slotType: existingSlot?.slotType || defaultP.slotType || 'lecture'
                    });
                }
                setPeriodStructure(completePeriods);
            } else {
                const grouped = {};
                DAYS.forEach(day => { grouped[day] = {}; });
                setSlots(grouped);
                setPeriodStructure([...DEFAULT_PERIODS]);
            }
        } catch (error) {
            console.error('Error loading timetable:', error);
            setTimetable(null);
            const grouped = {};
            DAYS.forEach(day => { grouped[day] = {}; });
            setSlots(grouped);
            setPeriodStructure([...DEFAULT_PERIODS]);
        } finally {
            setLoading(false);
        }
    }, [selectedSessionId]);

    const loadInstructorSchedule = async (teacherId) => {
        if (!teacherId) return;
        setLoading(true);
        try {
            const res = await timetableAPI.getTeacherSchedule(teacherId);
            setInstructorSchedule(res.data.data.schedule);
            
            // Derive instructor period structure from their slots across all classes
            let maxPeriod = 0;
            const allInstructorSlots = [];
            Object.values(res.data.data.schedule).forEach(daySlots => {
                daySlots.forEach(s => {
                    if (s.periodNumber > maxPeriod) maxPeriod = s.periodNumber;
                    allInstructorSlots.push(s);
                });
            });
            
            const tempStruct = [];
            for(let i=1; i<=maxPeriod || i<=8; i++) {
                const slot = allInstructorSlots.find(s => s.periodNumber === i);
                tempStruct.push({
                    periodNumber: i,
                    startTime: slot?.startTime || DEFAULT_PERIODS[i-1]?.startTime || '00:00',
                    endTime: slot?.endTime || DEFAULT_PERIODS[i-1]?.endTime || '00:00'
                });
            }
            setPeriodStructure(tempStruct);
            
        } catch (err) {
            toast.error('Failed to load instructor schedule');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (viewMode === 'class' || viewMode === 'timeline') {
            if (selectedClassId) loadTimetable(selectedClassId);
            else setTimetable(null);
        } else if (viewMode === 'instructor') {
            if (selectedInstructorId) loadInstructorSchedule(selectedInstructorId);
            else setInstructorSchedule(null);
        }
    }, [selectedClassId, selectedInstructorId, viewMode, loadTimetable]);

    const handleNumPeriodsChange = (count) => {
        const n = Math.max(1, Math.min(12, parseInt(count) || 8));
        const newPeriods = [];
        let startMins = 8 * 60; // 08:00 AM
        for (let i = 1; i <= n; i++) {
            const isBreak = (i === 4);
            const duration = isBreak ? 15 : 40;
            const endMins = startMins + duration;

            const sh = Math.floor(startMins / 60).toString().padStart(2, '0');
            const sm = (startMins % 60).toString().padStart(2, '0');
            const eh = Math.floor(endMins / 60).toString().padStart(2, '0');
            const em = (endMins % 60).toString().padStart(2, '0');

            newPeriods.push({
                periodNumber: i,
                startTime: `${sh}:${sm}`,
                endTime: `${eh}:${em}`,
                slotType: isBreak ? 'break_period' : 'lecture'
            });

            startMins = endMins;
        }
        setCreateForm(prev => ({
            ...prev,
            numPeriods: n,
            periods: newPeriods
        }));
    };

    const handleCreatePeriodTimingChange = (idx, field, value) => {
        setCreateForm(prev => {
            const copy = [...prev.periods];
            copy[idx] = { ...copy[idx], [field]: value };
            return { ...prev, periods: copy };
        });
    };

    const handleCreateTimetable = async () => {
        if (!createForm.name || !createForm.effectiveFrom || !selectedClassId) {
            toast.error('Please fill all required fields');
            return;
        }

        setSaving(true);
        try {
            const academicYearId = user?.currentAcademicYearId || selectedSessionId;
            const payload = {
                classId: selectedClassId,
                academicYearId,
                name: createForm.name,
                effectiveFrom: createForm.effectiveFrom,
            };
            if (createForm.effectiveTo) {
                payload.effectiveTo = createForm.effectiveTo;
            }
            
            const res = await timetableAPI.create(payload);
            const newTt = res.data.data?.timetable;
            toast.success('Timetable created!');
            setShowCreateModal(false);
            if (createForm.periods && createForm.periods.length > 0) {
                setPeriodStructure(createForm.periods);
            }
            setCreateForm({
                name: '',
                effectiveFrom: '',
                effectiveTo: '',
                numPeriods: 8,
                periods: [...DEFAULT_PERIODS]
            });
            loadTimetable(selectedClassId);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to create timetable');
        } finally {
            setSaving(false);
        }
    };

    // Work Log modal trigger
    const handleOpenWorkLogModal = (e, day, period, slot) => {
        e?.stopPropagation?.();
        const dayObj = weekDays.find(w => w.dayKey === day);
        setWorkLogData({
            period,
            slot: slot || slots[day]?.[period.periodNumber] || null,
            day,
            dateStr: dayObj?.dateStr || new Date().toISOString().split('T')[0]
        });
        setShowWorkLogModal(true);
    };

    const handleWorkSaved = (logData) => {
        const key = `${logData.slotId || logData.periodNumber}_${logData.dateStr}`;
        setLoggedWorkMap(prev => ({
            ...prev,
            [key]: logData
        }));
    };

    // Calculate time status for a period and day
    const getPeriodTimeStatus = (period, dayObj) => {
        if (!dayObj?.isToday) {
            const todayStr = new Date().toISOString().split('T')[0];
            if (dayObj?.dateStr && dayObj.dateStr < todayStr) return { status: 'past', progressPercent: 0 };
            return { status: 'future', progressPercent: 0 };
        }

        const now = new Date();
        const currentMins = now.getHours() * 60 + now.getMinutes();
        const [sh, sm] = (period.startTime || '08:00').split(':').map(Number);
        const [eh, em] = (period.endTime || '08:40').split(':').map(Number);
        const startMins = sh * 60 + sm;
        const endMins = eh * 60 + em;

        if (currentMins >= endMins) {
            return { status: 'past', progressPercent: 100 };
        }
        if (currentMins >= startMins && currentMins < endMins) {
            const total = Math.max(endMins - startMins, 1);
            const elapsed = currentMins - startMins;
            const progressPercent = Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
            return { status: 'current', progressPercent };
        }
        return { status: 'future', progressPercent: 0 };
    };

    // Slot Editing
    const handleSlotClick = (day, period) => {
        if (!timetable || viewMode !== 'class') return;
        const existing = slots[day]?.[period.periodNumber];

        setEditingSlot({ day, periodNumber: period.periodNumber, existing });
        setSlotForm({
            subjectId: existing?.subjectId || '',
            instructorId: existing?.instructorId || '',
            roomNumber: existing?.roomNumber || '',
            slotType: existing?.slotType || period.slotType || 'lecture',
            startTime: existing?.startTime || period.startTime || '',
            endTime: existing?.endTime || period.endTime || ''
        });
        setShowSlotModal(true);
    };

    const handleSaveSlot = async () => {
        if (!timetable) return;
        setSaving(true);
        try {
            const { day, periodNumber, existing } = editingSlot;

            if (existing?.id) {
                await timetableAPI.updateSlot(existing.id, {
                    subjectId: slotForm.subjectId || null,
                    instructorId: slotForm.instructorId || null,
                    roomNumber: slotForm.roomNumber || null,
                    slotType: slotForm.slotType,
                    startTime: slotForm.startTime,
                    endTime: slotForm.endTime
                });
                toast.success('Slot updated');
            } else {
                await timetableAPI.addSlot(timetable.id, {
                    dayOfWeek: day,
                    periodNumber,
                    startTime: slotForm.startTime || '08:00',
                    endTime: slotForm.endTime || '08:40',
                    subjectId: slotForm.subjectId || null,
                    instructorId: slotForm.instructorId || null,
                    roomNumber: slotForm.roomNumber || null,
                    slotType: slotForm.slotType
                });
                toast.success('Slot added');
            }
            setShowSlotModal(false);
            loadTimetable(selectedClassId);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save slot');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteSlot = async () => {
        if (!editingSlot?.existing?.id) return;
        setSaving(true);
        try {
            await timetableAPI.deleteSlot(editingSlot.existing.id);
            toast.success('Slot removed');
            setShowSlotModal(false);
            loadTimetable(selectedClassId);
        } catch (error) {
            toast.error('Failed to delete slot');
        } finally {
            setSaving(false);
        }
    };

    // Period Editing & Reordering
    const handleEditPeriodClick = (period) => {
        setEditingPeriod(period);
        setPeriodForm({ startTime: period.startTime, endTime: period.endTime, slotType: period.slotType || 'lecture' });
        setShowPeriodModal(true);
    };

    const handleSavePeriodTiming = async () => {
        if(!timetable) return;
        setSaving(true);
        try {
            // Find all slots with this period number
            const slotsToUpdate = [];
            DAYS.forEach(d => {
                const s = slots[d]?.[editingPeriod.periodNumber];
                if(s) slotsToUpdate.push(s);
            });
            
            // Sequential update to avoid overload
            for(const s of slotsToUpdate) {
                await timetableAPI.updateSlot(s.id, {
                    startTime: periodForm.startTime,
                    endTime: periodForm.endTime,
                });
            }
            
            // Also locally update periodStructure
            setPeriodStructure(prev => prev.map(p => 
                p.periodNumber === editingPeriod.periodNumber 
                    ? { ...p, startTime: periodForm.startTime, endTime: periodForm.endTime }
                    : p
            ));
            
            toast.success('Period timings updated successfully');
            setShowPeriodModal(false);
            loadTimetable(selectedClassId); // Reload to ensure full sync
        } catch(err) {
            toast.error('Failed to update period timings');
        } finally {
            setSaving(false);
        }
    };

    const handleRemovePeriod = async (periodNumber) => {
        const ok = await confirm({
            title: `Remove Period ${periodNumber}?`,
            message: `Remove Period ${periodNumber} across all days? All assigned class slots for this period will be deleted.`,
            confirmText: 'Remove Period',
            cancelText: 'Cancel',
            type: 'danger',
        });
        if (!ok) return;
        setSaving(true);
        try {
            const slotsToDelete = [];
            DAYS.forEach(d => {
                const s = slots[d]?.[periodNumber];
                if(s) slotsToDelete.push(s);
            });
            
            for(const s of slotsToDelete) {
                await timetableAPI.deleteSlot(s.id);
            }
            
            toast.success(`Period ${periodNumber} removed`);
            setPeriodStructure(prev => prev.filter(p => p.periodNumber !== periodNumber));
            loadTimetable(selectedClassId);
        } catch(e) {
            toast.error('Failed to remove period');
        } finally {
            setSaving(false);
        }
    };

    const handleAddPeriod = () => {
        const nextPeriodNo = periodStructure.length > 0 ? Math.max(...periodStructure.map(p => p.periodNumber)) + 1 : 1;
        const lastPeriod = periodStructure.length > 0 ? periodStructure[periodStructure.length - 1] : { endTime: '08:00' };
        
        // Add 40 mins to last end time
        let st = lastPeriod.endTime;
        if(!st) st = '08:00';
        const [h,m] = st.split(':').map(Number);
        const startMins = h * 60 + m;
        const endMins = startMins + 40;
        const sh = Math.floor(startMins / 60).toString().padStart(2, '0');
        const sm = (startMins % 60).toString().padStart(2, '0');
        const eh = Math.floor(endMins / 60).toString().padStart(2, '0');
        const em = (endMins % 60).toString().padStart(2, '0');
        
        const newPeriod = {
            periodNumber: nextPeriodNo,
            startTime: `${sh}:${sm}`,
            endTime: `${eh}:${em}`,
            slotType: 'lecture'
        };
        
        setPeriodStructure(prev => [...prev, newPeriod]);
        // Note: Slots are not created until user clicks the grid to add one, 
        // to avoid spamming the DB with empty slots.
    };

    // Drag and Drop implementation
    const [draggedPeriodIndex, setDraggedPeriodIndex] = useState(null);
    const [dragOverIndex, setDragOverIndex] = useState(null);

    const onDragStart = (e, index) => {
        setDraggedPeriodIndex(index);
        e.dataTransfer.effectAllowed = "move";
        // To style the ghost image, we could do more, but standard is fine
    };

    const onDragOver = (e, index) => {
        e.preventDefault();
        setDragOverIndex(index);
    };

    const onDrop = async (e, targetIndex) => {
        e.preventDefault();
        setDragOverIndex(null);
        if (draggedPeriodIndex === null || draggedPeriodIndex === targetIndex) return;
        
        const sourcePeriod = periodStructure[draggedPeriodIndex];
        const targetPeriod = periodStructure[targetIndex];
        
        // Swap their timings
        setSaving(true);
        try {
            // Get all slots for source and target period numbers
            const sourceSlots = [];
            const targetSlots = [];
            DAYS.forEach(d => {
                if(slots[d]?.[sourcePeriod.periodNumber]) sourceSlots.push(slots[d][sourcePeriod.periodNumber]);
                if(slots[d]?.[targetPeriod.periodNumber]) targetSlots.push(slots[d][targetPeriod.periodNumber]);
            });
            
            // Loop and update timings in the DB to swap them
            for(const s of sourceSlots) {
                await timetableAPI.updateSlot(s.id, { startTime: targetPeriod.startTime, endTime: targetPeriod.endTime });
            }
            for(const s of targetSlots) {
                await timetableAPI.updateSlot(s.id, { startTime: sourcePeriod.startTime, endTime: sourcePeriod.endTime });
            }
            
            // Swap in local UI state immediately
            const newStruct = [...periodStructure];
            newStruct[draggedPeriodIndex].startTime = targetPeriod.startTime;
            newStruct[draggedPeriodIndex].endTime = targetPeriod.endTime;
            newStruct[targetIndex].startTime = sourcePeriod.startTime;
            newStruct[targetIndex].endTime = sourcePeriod.endTime;
            setPeriodStructure(newStruct);
            
            toast.success('Period timings swapped');
            loadTimetable(selectedClassId);
            
        } catch(err) {
            toast.error('Failed to swap period timings');
        } finally {
            setSaving(false);
            setDraggedPeriodIndex(null);
        }
    };

    const handleAutoFillWeek = async () => {
        if (!timetable) return;
        const slotsToCreate = [];
        DAYS.forEach(day => {
            periodStructure.forEach(dp => {
                if (!slots[day]?.[dp.periodNumber]) {
                    slotsToCreate.push({
                        dayOfWeek: day,
                        periodNumber: dp.periodNumber,
                        startTime: dp.startTime,
                        endTime: dp.endTime,
                        slotType: dp.slotType || 'lecture'
                    });
                }
            });
        });

        if (slotsToCreate.length === 0) {
            toast.info('All slots already filled');
            return;
        }

        setSaving(true);
        try {
            await timetableAPI.addSlotsBulk(timetable.id, slotsToCreate);
            toast.success(`${slotsToCreate.length} empty slots auto-filled`);
            loadTimetable(selectedClassId);
        } catch (error) {
            toast.error('Failed to auto-fill');
        } finally {
            setSaving(false);
        }
    };

    // Calculate Summary Data
    const getSummary = () => {
        if(!timetable || !slots) return { stats: [], totalAssigned: 0 };
        const subjectStats = {};
        let totalAssigned = 0;
        
        // Initialize with core subjects of the class to show zeroes
        subjects.forEach(sub => {
            subjectStats[sub.id] = { name: sub.name, count: 0, mins: 0, color: 'text-slate-600' };
        });
        
        Object.values(slots).forEach(daySlots => {
            Object.values(daySlots).forEach(s => {
                if(s.subjectId) {
                    if(!subjectStats[s.subjectId]) {
                        subjectStats[s.subjectId] = { name: s.subject?.name || 'Unknown', count: 0, mins: 0, color: 'text-slate-600' };
                    }
                    subjectStats[s.subjectId].count++;
                    
                    // Calc mins
                    const [h1,m1] = s.startTime.split(':').map(Number);
                    const [h2,m2] = s.endTime.split(':').map(Number);
                    const dur = (h2*60+m2) - (h1*60+m1);
                    subjectStats[s.subjectId].mins += dur;
                    totalAssigned++;
                } else if(s.slotType && s.slotType !== 'lecture' && s.slotType !== 'free') {
                    // Track non-subject slots like Break, Assembly, Sports
                    const key = 'type_' + s.slotType;
                    if(!subjectStats[key]) {
                        subjectStats[key] = { 
                            name: SLOT_TYPES.find(t=>t.value===s.slotType)?.label || s.slotType, 
                            count: 0, mins: 0, 
                            color: getSlotColor(s.slotType).split(' ')[1] // get text color
                        };
                    }
                    subjectStats[key].count++;
                    const [h1,m1] = s.startTime.split(':').map(Number);
                    const [h2,m2] = s.endTime.split(':').map(Number);
                    const dur = (h2*60+m2) - (h1*60+m1);
                    subjectStats[key].mins += dur;
                    totalAssigned++;
                }
            });
        });
        
        return {
            stats: Object.values(subjectStats).sort((a,b) => b.count - a.count),
            totalAssigned
        };
    };

    const summary = useMemo(() => getSummary(), [slots, subjects, timetable]);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
            <PageHeader title="Timetable Administration" titleHindi="समय सारणी प्रशासन" />

            <main className="max-w-full mx-auto px-4 lg:px-6 py-6 space-y-6">
                
                {/* View Mode Tabs */}
                <div className="flex border-b border-slate-200 dark:border-slate-800">
                    <button 
                        onClick={() => setViewMode('class')}
                        className={`px-5 py-3 text-sm font-medium border-b-2 flex items-center gap-2 transition-colors ${viewMode === 'class' ? 'border-primary-500 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        <LayoutGrid className="w-4 h-4" /> Class View
                    </button>
                    <button 
                        onClick={() => setViewMode('instructor')}
                        className={`px-5 py-3 text-sm font-medium border-b-2 flex items-center gap-2 transition-colors ${viewMode === 'instructor' ? 'border-primary-500 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        <User className="w-4 h-4" /> Instructor View
                    </button>
                    <button 
                        onClick={() => setViewMode('timeline')}
                        className={`px-5 py-3 text-sm font-medium border-b-2 flex items-center gap-2 transition-colors ${viewMode === 'timeline' ? 'border-primary-500 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        <CalendarIcon className="w-4 h-4" /> Timeline (3 Months)
                    </button>
                </div>

                {/* Filters Row */}
                <div className="card p-4">
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                        {(viewMode === 'class' || viewMode === 'timeline') && (
                            <div className="flex-1 w-full md:w-64">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">Select Class</label>
                                <select
                                    value={selectedClassId}
                                    onChange={(e) => setSelectedClassId(e.target.value)}
                                    className="input w-full md:w-64"
                                >
                                    <option value="">Choose a class...</option>
                                    {classes.map(c => (
                                        <option key={c.id} value={c.id}>
                                            {c.name || `Class ${c.gradeLevel}-${c.section}`}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                        
                        {viewMode === 'instructor' && (
                            <div className="flex-1 w-full md:w-64">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">Select Instructor</label>
                                <select
                                    value={selectedInstructorId}
                                    onChange={(e) => setSelectedInstructorId(e.target.value)}
                                    className="input w-full md:w-64"
                                >
                                    <option value="">Choose an instructor...</option>
                                    {instructors.map(i => (
                                        <option key={i.id} value={i.id}>
                                            {i.firstName} {i.lastName}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {viewMode === 'class' && selectedClassId && (
                            <div className="flex flex-wrap items-center gap-2 mt-auto">
                                {!timetable ? (
                                    <button onClick={() => {
                                        const date = new Date();
                                        const df = date.toISOString().split('T')[0];
                                        date.setMonth(date.getMonth() + 3);
                                        const dt = date.toISOString().split('T')[0];
                                        setCreateForm({
                                            name: '',
                                            effectiveFrom: df,
                                            effectiveTo: dt,
                                            numPeriods: 8,
                                            periods: [...DEFAULT_PERIODS]
                                        });
                                        setShowCreateModal(true);
                                    }} className="btn btn-primary">
                                        <Plus className="w-4 h-4" /> Create Timetable
                                    </button>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => setShowAIGeneratorModal(true)}
                                            className="btn btn-secondary bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800"
                                        >
                                            <Sparkles className="w-4 h-4 text-purple-600" /> AI Assistant
                                        </button>
                                        <button onClick={handleAutoFillWeek} disabled={saving} className="btn btn-secondary">
                                            <Clock className="w-4 h-4" /> Auto-fill Periods
                                        </button>
                                        <button onClick={() => loadTimetable(selectedClassId)} className="btn btn-ghost">
                                            <RefreshCw className="w-4 h-4" />
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Week Navigation & Timetable Info */}
                    {viewMode === 'class' && timetable && (
                        <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 text-sm text-slate-600 dark:text-slate-400">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setWeekOffset(prev => prev - 1)}
                                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
                                    title="Previous Week"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setWeekOffset(0)}
                                    className={`px-3 py-1 rounded-lg text-xs font-semibold border transition ${
                                        weekOffset === 0
                                            ? 'bg-primary-50 border-primary-300 text-primary-700 dark:bg-primary-950/40 dark:border-primary-800 dark:text-primary-300'
                                            : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                    }`}
                                >
                                    {weekOffset === 0 ? 'This Week (Live)' : `${weekDays[0]?.formattedDate} - ${weekDays[5]?.formattedDate}`}
                                </button>
                                <button
                                    onClick={() => setWeekOffset(prev => prev + 1)}
                                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
                                    title="Next Week"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="flex items-center gap-4">
                                <span className="flex items-center gap-1 font-semibold text-slate-800 dark:text-slate-200">
                                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                                    {timetable.name}
                                </span>
                                <span>From: {formatDate(timetable.effectiveFrom)}</span>
                                {timetable.effectiveTo && <span>To: {formatDate(timetable.effectiveTo)}</span>}
                            </div>
                        </div>
                    )}
                </div>

                {loading ? (
                    <div className="card p-12 flex justify-center">
                        <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
                    </div>
                ) : (
                    <>
                        {/* =========================================
                            CLASS VIEW
                        ========================================= */}
                        {viewMode === 'class' && selectedClassId && timetable && (
                            <>
                                <div className="card overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full border-collapse min-w-[950px]">
                                            <thead>
                                                <tr className="bg-gradient-to-r from-primary-600 to-indigo-600 text-white">
                                                    <th className="px-3 py-3 text-left text-sm font-semibold w-24">Period</th>
                                                    {weekDays.map(dayObj => {
                                                        const holiday = calendarHolidays[dayObj.dateStr];
                                                        return (
                                                            <th key={dayObj.dayKey} className={`px-3 py-2 text-center text-sm font-semibold transition ${dayObj.isToday ? 'bg-white/10 ring-2 ring-white/30' : ''}`}>
                                                                <div className="flex flex-col items-center">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span>{dayObj.fullDateDisplay}</span>
                                                                        {dayObj.isToday && (
                                                                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-400 text-slate-950 font-extrabold uppercase">
                                                                                Today
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    {holiday && (
                                                                        <div className="mt-1 px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-bold flex items-center gap-1 truncate max-w-[130px]" title={holiday.title}>
                                                                            <PartyPopper className="w-3 h-3 flex-shrink-0" />
                                                                            <span className="truncate">{holiday.title || 'Holiday'}</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </th>
                                                        );
                                                    })}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {periodStructure.map((period, index) => (
                                                    <tr 
                                                        key={`${period.periodNumber}-${index}`} 
                                                        className={`border-b border-slate-100 dark:border-slate-800 transition-colors ${dragOverIndex === index ? 'bg-primary-50 dark:bg-primary-900/10 border-t-2 border-t-primary-500' : ''} ${period.slotType === 'break_period' ? 'bg-amber-50/20 dark:bg-amber-900/5' : ''}`}
                                                        draggable
                                                        onDragStart={(e) => onDragStart(e, index)}
                                                        onDragOver={(e) => onDragOver(e, index)}
                                                        onDrop={(e) => onDrop(e, index)}
                                                    >
                                                        <td className="px-2 py-2 border-r border-slate-100 dark:border-slate-800 relative group bg-white dark:bg-slate-900 z-10 w-24">
                                                            <button 
                                                                className="absolute -left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-primary-500 cursor-grab active:cursor-grabbing transition-opacity"
                                                                title="Drag to swap period timings"
                                                            >
                                                                <GripVertical className="w-4 h-4" />
                                                            </button>
                                                            <div className="pl-4 pr-1 group">
                                                                <div className="flex items-center justify-between">
                                                                    <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 cursor-pointer hover:text-primary-600 flex items-center gap-1" onClick={() => handleEditPeriodClick(period)}>
                                                                        P{period.periodNumber} <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                                                                    </div>
                                                                    <button onClick={() => handleRemovePeriod(period.periodNumber)} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                        <Trash2 className="w-3 h-3" />
                                                                    </button>
                                                                </div>
                                                                <div 
                                                                    className="text-[10px] text-slate-500 font-mono mt-0.5 cursor-pointer hover:text-primary-500"
                                                                    onClick={() => handleEditPeriodClick(period)}
                                                                >
                                                                    {period.startTime}-{period.endTime}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        {weekDays.map(dayObj => {
                                                            const day = dayObj.dayKey;
                                                            const slot = slots[day]?.[period.periodNumber];
                                                            const holiday = calendarHolidays[dayObj.dateStr];
                                                            const { status: timeStatus, progressPercent } = getPeriodTimeStatus(period, dayObj);
                                                            const workKey = `${slot?.id || period.periodNumber}_${dayObj.dateStr}`;
                                                            const hasLoggedWork = !!loggedWorkMap[workKey];

                                                            // Determine styling
                                                            let cellClass = "w-full min-h-[68px] rounded-lg px-2 py-1.5 text-left transition-all border relative overflow-hidden group ";
                                                            if (holiday) {
                                                                cellClass += "bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-200 ";
                                                            } else if (timeStatus === 'current') {
                                                                cellClass += "border-emerald-500 ring-2 ring-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-950/30 shadow-md ";
                                                            } else if (timeStatus === 'past') {
                                                                cellClass += "bg-slate-100/80 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 opacity-75 hover:opacity-100 ";
                                                            } else if (slot) {
                                                                cellClass += getSlotColor(slot.slotType) + " hover:shadow-md hover:-translate-y-0.5 ";
                                                            } else {
                                                                cellClass += "bg-slate-50 dark:bg-slate-800/40 border-dashed border-slate-200 dark:border-slate-700 hover:border-primary-300 hover:bg-primary-50/50 ";
                                                            }

                                                            return (
                                                                <td key={day} className="px-1 py-1 border-r border-slate-100 dark:border-slate-800 align-top">
                                                                    <div className={cellClass}>
                                                                        {/* Fluid Green Covered-Time Progress Fill for Live Period */}
                                                                        {timeStatus === 'current' && !holiday && (
                                                                            <div
                                                                                className="absolute inset-0 bg-emerald-400/25 dark:bg-emerald-500/25 rounded-lg pointer-events-none transition-all duration-1000 ease-linear"
                                                                                style={{ width: `${progressPercent}%` }}
                                                                            />
                                                                        )}

                                                                        {/* Slot Content */}
                                                                        <div className="relative z-10 flex flex-col justify-between h-full" onClick={() => handleSlotClick(day, period)}>
                                                                            <div>
                                                                                {/* Header Row: Live badge & Log work button */}
                                                                                <div className="flex items-center justify-between gap-1">
                                                                                    {timeStatus === 'current' && !holiday && (
                                                                                        <span className="inline-flex items-center gap-1 text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-full bg-emerald-600 text-white animate-pulse">
                                                                                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                                                                                            LIVE ({progressPercent}%)
                                                                                        </span>
                                                                                    )}
                                                                                    {hasLoggedWork && (
                                                                                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 flex items-center gap-0.5 ml-auto">
                                                                                            <Check className="w-2.5 h-2.5" /> Logged
                                                                                        </span>
                                                                                    )}
                                                                                    {/* Plus icon to log work done */}
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={(e) => handleOpenWorkLogModal(e, day, period, slot)}
                                                                                        className="opacity-0 group-hover:opacity-100 p-1 rounded-md bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 text-slate-600 hover:text-primary-600 hover:bg-primary-50 transition ml-auto"
                                                                                        title="Log Work Done / Class Activity"
                                                                                    >
                                                                                        <Plus className="w-3.5 h-3.5" />
                                                                                    </button>
                                                                                </div>

                                                                                {slot ? (
                                                                                    <>
                                                                                        <div className="text-xs font-semibold truncate leading-tight mt-1">
                                                                                            {slot.slotType === 'break_period' ? '☕ Break' :
                                                                                            slot.slotType === 'assembly' ? '🏫 Assembly' :
                                                                                            slot.slotType === 'free' ? '— Free' :
                                                                                            slot.slotType === 'sports' ? '⚽ Sports' :
                                                                                            slot.slotType === 'library' ? '📚 Library' :
                                                                                            slot.subject?.code || slot.subject?.name || 'No Subject'}
                                                                                        </div>
                                                                                        {slot.instructor && (
                                                                                            <div className="text-[10px] opacity-80 truncate mt-0.5">
                                                                                                {slot.instructor.firstName} {slot.instructor.lastName?.[0]}.
                                                                                            </div>
                                                                                        )}
                                                                                        {slot.roomNumber && (
                                                                                            <div className="text-[10px] opacity-60 truncate">
                                                                                                Room {slot.roomNumber}
                                                                                            </div>
                                                                                        )}
                                                                                    </>
                                                                                ) : (
                                                                                    <div className="flex flex-col items-center justify-center py-2 text-slate-300 dark:text-slate-600 group-hover:text-primary-500 transition">
                                                                                        <Plus className="w-4 h-4" />
                                                                                        <span className="text-[9px]">Add</span>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                            );
                                                        })}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        
                                        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between">
                                            <button onClick={handleAddPeriod} className="text-sm font-medium text-slate-600 hover:text-primary-600 flex items-center gap-1">
                                                <Plus className="w-4 h-4" /> Add Period Row
                                            </button>
                                            <span className="text-xs text-slate-400">
                                                Grid Integrity: All {periodStructure.length} periods active across Monday to Saturday
                                            </span>
                                        </div>
                                    </div>

                                    {/* Legend */}
                                    <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 flex flex-wrap items-center gap-3">
                                        <span className="text-[11px] font-bold text-slate-500 uppercase">Slots:</span>
                                        {SLOT_TYPES.map(st => (
                                            <span key={st.value} className={`px-2 py-0.5 rounded text-[10px] font-medium border ${st.color}`}>
                                                {st.label}
                                            </span>
                                        ))}
                                        <span className="px-2 py-0.5 rounded text-[10px] font-medium border bg-emerald-100 text-emerald-800 border-emerald-300 flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping" /> Live Active
                                        </span>
                                        <span className="px-2 py-0.5 rounded text-[10px] font-medium border bg-slate-200 text-slate-600 border-slate-300">
                                            Past Period
                                        </span>
                                    </div>
                                </div>
                                
                                {/* Summary Panel */}
                                <div className="card p-5 mt-6">
                                    <h3 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-4">
                                        <BookOpen className="w-5 h-5 text-primary-500" /> Weekly Subject Summary
                                    </h3>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                        {summary.stats.map((s, idx) => (
                                            <div key={idx} className={`p-3 rounded-xl border flex flex-col justify-between ${s.count === 0 ? 'bg-red-50 border-red-100 dark:bg-red-900/10 dark:border-red-900/30' : 'bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700'}`}>
                                                <div className={`text-sm font-medium truncate ${s.color || 'text-slate-900 dark:text-white'}`}>{s.name}</div>
                                                <div className="flex items-center justify-between mt-2">
                                                    <div className="text-2xl font-bold text-slate-700 dark:text-slate-300">{s.count}</div>
                                                    <div className="text-[10px] text-slate-500 text-right leading-tight">
                                                        <div>periods</div>
                                                        <div>{s.mins} min</div>
                                                    </div>
                                                </div>
                                                {s.count === 0 && <div className="text-[10px] text-red-500 font-medium mt-1">⚠️ None assigned</div>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                        {viewMode === 'class' && selectedClassId && !timetable && (
                            <div className="card p-12 text-center mt-6">
                                <Clock className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                                <h3 className="text-lg font-semibold mb-2">No Timetable Found</h3>
                                <p className="text-slate-500 mb-6">Create a timetable for this class to start scheduling periods.</p>
                                <button onClick={() => {
                                    const date = new Date();
                                    const df = date.toISOString().split('T')[0];
                                    date.setMonth(date.getMonth() + 3);
                                    const dt = date.toISOString().split('T')[0];
                                    setCreateForm({
                                        name: '',
                                        effectiveFrom: df,
                                        effectiveTo: dt,
                                        numPeriods: 8,
                                        periods: [...DEFAULT_PERIODS]
                                    });
                                    setShowCreateModal(true);
                                }} className="btn btn-primary">
                                    <Plus className="w-4 h-4" /> Create Timetable
                                </button>
                            </div>
                        )}

                        {/* =========================================
                            INSTRUCTOR VIEW (Read Only)
                        ========================================= */}
                        {viewMode === 'instructor' && selectedInstructorId && instructorSchedule && (
                            <div className="card overflow-hidden mt-6">
                                <div className="overflow-x-auto">
                                    <table className="w-full border-collapse min-w-[900px]">
                                        <thead>
                                            <tr className="bg-gradient-to-r from-blue-600 to-indigo-600">
                                                <th className="px-3 py-3 text-left text-sm font-semibold text-white w-24">Period</th>
                                                {DAYS.map(day => (
                                                    <th key={day} className="px-3 py-3 text-center text-sm font-semibold text-white">
                                                        {DAY_LABELS_FULL[day]}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {periodStructure.map((period, index) => (
                                                <tr key={index} className="border-b border-slate-100 dark:border-slate-800">
                                                    <td className="px-3 py-2 border-r border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                                                        <div className="text-xs font-semibold">P{period.periodNumber}</div>
                                                        <div className="text-[10px] text-slate-500">{period.startTime}-{period.endTime}</div>
                                                    </td>
                                                    {DAYS.map(day => {
                                                        const slot = instructorSchedule[day]?.find(s => s.periodNumber === period.periodNumber);
                                                        return (
                                                            <td key={day} className="px-1 py-1 border-r border-slate-100 dark:border-slate-800">
                                                                {slot ? (
                                                                    <div className={`w-full min-h-[60px] rounded-lg px-2 py-1.5 border shadow-sm ${getSlotColor(slot.slotType)}`}>
                                                                        <div className="text-xs font-bold truncate">
                                                                            {slot.timetable?.class?.name || `Class ${slot.timetable?.class?.gradeLevel}`}
                                                                        </div>
                                                                        <div className="text-[10px] font-medium mt-0.5 truncate opacity-90">
                                                                            {slot.subject?.name || slot.slotType}
                                                                        </div>
                                                                        {slot.roomNumber && (
                                                                            <div className="text-[10px] opacity-75 truncate mt-1">
                                                                                Room {slot.roomNumber}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    <div className="w-full h-full min-h-[60px] bg-slate-50 dark:bg-slate-800/30 rounded-lg flex items-center justify-center border border-dashed border-slate-200 dark:border-slate-700">
                                                                        <span className="text-xs text-slate-400">Free</span>
                                                                    </div>
                                                                )}
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* =========================================
                            TIMELINE VIEW
                        ========================================= */}
                        {viewMode === 'timeline' && selectedClassId && (
                            <div className="card p-6 mt-6">
                                <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                                    <GanttChartSquare className="w-5 h-5 text-indigo-500" /> Timetable Schedule (3 Months)
                                </h3>
                                
                                {timetableHistory.length === 0 ? (
                                    <div className="text-center py-8 text-slate-500">No timetables found for this class.</div>
                                ) : (
                                    <div className="space-y-4">
                                        {timetableHistory.map(tt => {
                                            const sf = new Date(tt.effectiveFrom);
                                            const st = tt.effectiveTo ? new Date(tt.effectiveTo) : null;
                                            const isPast = st && st < new Date();
                                            const isActive = !isPast && sf <= new Date() && (!st || st >= new Date());
                                            
                                            return (
                                                <div key={tt.id} className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${isActive ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20' : isPast ? 'bg-slate-50 border-slate-200 dark:bg-slate-900/50' : 'bg-white border-slate-200 dark:bg-slate-800'}`}>
                                                    <div>
                                                        <h4 className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                                            {tt.name} 
                                                            {isActive && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700">ACTIVE</span>}
                                                            {isPast && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-600">PAST</span>}
                                                            {!isActive && !isPast && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700">UPCOMING</span>}
                                                        </h4>
                                                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                                            {formatDateRange(sf, st)}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <button 
                                                            onClick={() => {
                                                                setTimetable(tt);
                                                                setViewMode('class');
                                                            }}
                                                            className="btn btn-secondary btn-sm"
                                                        >
                                                            View Details
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {(!selectedClassId && (viewMode === 'class' || viewMode === 'timeline')) || 
                         (!selectedInstructorId && viewMode === 'instructor') ? (
                            <div className="card p-12 text-center mt-6">
                                <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">Select to View</h3>
                                <p className="text-slate-500 dark:text-slate-400">Choose an option from the dropdown above to view the schedule.</p>
                            </div>
                        ) : null}
                    </>
                )}
            </main>

            {/* Create Timetable Modal with Configurable Periods (Default 8 with editable timings) */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full max-h-[90vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Create Timetable</h3>
                            <p className="text-xs text-slate-500 mt-0.5">Set up timetable details, periods count, and timing structure.</p>
                        </div>
                        <div className="p-6 space-y-4 overflow-y-auto flex-1">
                            <div>
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">Timetable Name *</label>
                                <input
                                    type="text"
                                    value={createForm.name}
                                    onChange={(e) => setCreateForm(f => ({ ...f, name: e.target.value }))}
                                    placeholder="e.g., Summer Term 2026 Timetable"
                                    className="input w-full text-xs"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">Effective From *</label>
                                    <input
                                        type="date"
                                        value={createForm.effectiveFrom}
                                        onChange={(e) => setCreateForm(f => ({ ...f, effectiveFrom: e.target.value }))}
                                        className="input w-full text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">Effective To (optional)</label>
                                    <input
                                        type="date"
                                        value={createForm.effectiveTo}
                                        onChange={(e) => setCreateForm(f => ({ ...f, effectiveTo: e.target.value }))}
                                        className="input w-full text-xs"
                                    />
                                </div>
                            </div>

                            {/* Number of Periods Selector */}
                            <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                        Number of Periods (Default: 8)
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            min={1}
                                            max={12}
                                            value={createForm.numPeriods || 8}
                                            onChange={(e) => handleNumPeriodsChange(e.target.value)}
                                            className="input input-sm w-20 text-center font-bold text-xs"
                                        />
                                        <span className="text-xs text-slate-400">Periods</span>
                                    </div>
                                </div>

                                {/* Editable Timings Table */}
                                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden mt-2">
                                    <div className="max-h-48 overflow-y-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-slate-100 dark:bg-slate-800/70 text-slate-600 dark:text-slate-400">
                                                <tr>
                                                    <th className="py-1.5 px-3">Period</th>
                                                    <th className="py-1.5 px-3">Start</th>
                                                    <th className="py-1.5 px-3">End</th>
                                                    <th className="py-1.5 px-3">Type</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                {createForm.periods.map((p, idx) => (
                                                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                                        <td className="py-1 px-3 font-bold text-slate-800 dark:text-slate-200">
                                                            P{p.periodNumber}
                                                        </td>
                                                        <td className="py-1 px-3">
                                                            <input
                                                                type="time"
                                                                value={p.startTime}
                                                                onChange={(e) => handleCreatePeriodTimingChange(idx, 'startTime', e.target.value)}
                                                                className="input input-xs w-24 font-mono text-[11px]"
                                                            />
                                                        </td>
                                                        <td className="py-1 px-3">
                                                            <input
                                                                type="time"
                                                                value={p.endTime}
                                                                onChange={(e) => handleCreatePeriodTimingChange(idx, 'endTime', e.target.value)}
                                                                className="input input-xs w-24 font-mono text-[11px]"
                                                            />
                                                        </td>
                                                        <td className="py-1 px-3">
                                                            <select
                                                                value={p.slotType || 'lecture'}
                                                                onChange={(e) => handleCreatePeriodTimingChange(idx, 'slotType', e.target.value)}
                                                                className="select select-xs text-[11px]"
                                                            >
                                                                {SLOT_TYPES.map(st => (
                                                                    <option key={st.value} value={st.value}>{st.label}</option>
                                                                ))}
                                                            </select>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex gap-3 bg-slate-50 dark:bg-slate-950">
                            <button onClick={() => setShowCreateModal(false)} className="btn btn-secondary flex-1 text-xs">Cancel</button>
                            <button onClick={handleCreateTimetable} disabled={saving} className="btn btn-primary flex-1 text-xs">
                                {saving ? 'Creating...' : 'Create Timetable'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Slot Edit Modal */}
            {showSlotModal && editingSlot && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                                {editingSlot.existing ? 'Edit Slot' : 'Add Slot'}
                            </h3>
                            <p className="text-xs text-slate-500 mt-1">
                                {DAY_LABELS_FULL[editingSlot.day]} — P{editingSlot.periodNumber} ({slotForm.startTime} - {slotForm.endTime})
                            </p>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">Slot Type</label>
                                <select
                                    value={slotForm.slotType}
                                    onChange={(e) => setSlotForm(f => ({ ...f, slotType: e.target.value }))}
                                    className="input w-full text-xs"
                                >
                                    {SLOT_TYPES.map(st => (
                                        <option key={st.value} value={st.value}>{st.label}</option>
                                    ))}
                                </select>
                            </div>

                            {(slotForm.slotType === 'lecture' || slotForm.slotType === 'lab') && (
                                <>
                                    <div>
                                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">Subject</label>
                                        <select
                                            value={slotForm.subjectId}
                                            onChange={(e) => setSlotForm(f => ({ ...f, subjectId: e.target.value }))}
                                            className="input w-full text-xs"
                                        >
                                            <option value="">Select subject...</option>
                                            {subjects.map(s => (
                                                <option key={s.id} value={s.id}>{s.name}{s.nameHindi ? ` (${s.nameHindi})` : ''}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">Instructor</label>
                                        <select
                                            value={slotForm.instructorId}
                                            onChange={(e) => setSlotForm(f => ({ ...f, instructorId: e.target.value }))}
                                            className="input w-full text-xs"
                                        >
                                            <option value="">Select instructor...</option>
                                            {instructors.map(i => (
                                                <option key={i.id} value={i.id}>
                                                    {i.firstName} {i.lastName} ({i.email})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">Room Number</label>
                                        <input
                                            type="text"
                                            value={slotForm.roomNumber}
                                            onChange={(e) => setSlotForm(f => ({ ...f, roomNumber: e.target.value }))}
                                            placeholder="e.g., Lab-1, Room 201"
                                            className="input w-full text-xs"
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex gap-3 bg-slate-50 dark:bg-slate-950">
                            {editingSlot.existing && (
                                <button onClick={handleDeleteSlot} disabled={saving} className="btn btn-ghost text-red-600 hover:bg-red-50 text-xs">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                            <div className="flex-1" />
                            <button onClick={() => setShowSlotModal(false)} className="btn btn-secondary text-xs">Cancel</button>
                            <button onClick={handleSaveSlot} disabled={saving} className="btn btn-primary text-xs">
                                {saving ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Period Timings Modal */}
            {showPeriodModal && editingPeriod && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                <Clock className="w-5 h-5 text-primary-500" /> Edit Period {editingPeriod.periodNumber}
                            </h3>
                            <p className="text-xs text-slate-500 mt-1">Updates timings for this period across all days.</p>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">Start Time</label>
                                    <input
                                        type="time"
                                        value={periodForm.startTime}
                                        onChange={(e) => setPeriodForm(f => ({ ...f, startTime: e.target.value }))}
                                        className="input w-full font-mono text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">End Time</label>
                                    <input
                                        type="time"
                                        value={periodForm.endTime}
                                        onChange={(e) => setPeriodForm(f => ({ ...f, endTime: e.target.value }))}
                                        className="input w-full font-mono text-xs"
                                    />
                                </div>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400">
                                <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-500" />
                                <span>Note: Changing these timings will stretch or squeeze all slots in Period {editingPeriod.periodNumber}.</span>
                            </div>
                        </div>
                        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex gap-3 bg-slate-50 dark:bg-slate-950">
                            <button onClick={() => setShowPeriodModal(false)} className="btn btn-secondary flex-1 text-xs">Cancel</button>
                            <button onClick={handleSavePeriodTiming} disabled={saving} className="btn btn-primary flex-1 text-xs">
                                {saving ? 'Saving...' : 'Apply Timing'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* AI Timetable Assistant Modal */}
            <AITimetableGeneratorModal
                isOpen={showAIGeneratorModal}
                onClose={() => setShowAIGeneratorModal(false)}
                timetable={timetable}
                classId={selectedClassId}
                periodStructure={periodStructure}
                existingSlots={slots}
                subjects={subjects}
                instructors={instructors}
                onSlotsApplied={() => loadTimetable(selectedClassId)}
            />

            {/* Period Work Log Modal */}
            <PeriodWorkLogModal
                isOpen={showWorkLogModal}
                onClose={() => setShowWorkLogModal(false)}
                period={workLogData.period}
                slot={workLogData.slot}
                day={workLogData.day}
                dateStr={workLogData.dateStr}
                classId={selectedClassId}
                instructors={instructors}
                subjects={subjects}
                currentUser={user}
                onWorkSaved={handleWorkSaved}
            />
        </div>
    );
}
