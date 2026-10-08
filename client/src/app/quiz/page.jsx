'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
    Sparkles, HelpCircle, Play, Clock, 
    Share2, QrCode, Copy, Check, Trash2, Search, ArrowRight,
    Award, CheckCircle2, XCircle, RefreshCw, ChevronDown, ChevronUp,
    Users, Send, BarChart3, FileText, X, CheckSquare, Square,
    Edit3, Plus, LayoutGrid, List, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
    Wand2, ArrowUp, ArrowDown, Settings2, Filter, Layers, UserCheck
} from 'lucide-react';
import toast from 'react-hot-toast';
import QRCode from 'qrcode';
import PageHeader from '@/components/PageHeader';
import { useAuthStore } from '@/lib/store';
import { quizAPI, classesAPI } from '@/lib/api';
import MathRenderer from '@/components/MathRenderer';
import QuizReviewModal from '@/components/QuizReviewModal';

export default function QuizDashboardPage() {
    const router = useRouter();
    const { user, isAuthenticated, _hasHydrated } = useAuthStore();

    const [activeTab, setActiveTab] = useState('created'); // 'created' | 'completed'
    const [joinCodeInput, setJoinCodeInput] = useState('');
    const [reviewModalSubmission, setReviewModalSubmission] = useState(null);

    // List of created/available quizzes
    const [quizzes, setQuizzes] = useState([]);
    const [isLoadingQuizzes, setIsLoadingQuizzes] = useState(false);
    const [searchFilter, setSearchFilter] = useState('');

    // View Mode & Selection (Grid / List & Check All / Bulk Delete)
    const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
    const [selectedQuizIds, setSelectedQuizIds] = useState(new Set());
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);

    // Pagination & Page Jumper
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(9);
    const [pageJumperInput, setPageJumperInput] = useState('');

    // Edit Quiz Modal State
    const [editingQuiz, setEditingQuiz] = useState(null);
    const [editFormData, setEditFormData] = useState({
        title: '',
        description: '',
        keywords: '',
        difficulty: 'medium',
        timeLimitMinutes: 10,
        maxAttempts: 1,
        status: 'published',
        questions: []
    });
    const [expandedQuestionIndices, setExpandedQuestionIndices] = useState(new Set([0]));
    const [isSavingEdit, setIsSavingEdit] = useState(false);

    // Add More Questions with AI Panel State
    const [showAiAddPanel, setShowAiAddPanel] = useState(false);
    const [aiMoreKeywords, setAiMoreKeywords] = useState('');
    const [aiMoreCount, setAiMoreCount] = useState(3);
    const [aiMoreDifficulty, setAiMoreDifficulty] = useState('medium');
    const [isGeneratingMoreAI, setIsGeneratingMoreAI] = useState(false);
    const [aiImprovingQuestionIdx, setAiImprovingQuestionIdx] = useState(null);

    // List of completed submissions for student
    const [myResults, setMyResults] = useState([]);
    const [isLoadingResults, setIsLoadingResults] = useState(false);
    const [expandedResultIds, setExpandedResultIds] = useState(new Set());

    // Share / QR Code Modal
    const [shareQuiz, setShareQuiz] = useState(null);
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
    const [copied, setCopied] = useState(false);

    // AI Generator Modal in Dashboard
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [keywords, setKeywords] = useState('');
    const [difficulty, setDifficulty] = useState('medium');
    const [questionCount, setQuestionCount] = useState(5);
    const [timeLimitMinutes, setTimeLimitMinutes] = useState(10);
    const [maxAttemptsInput, setMaxAttemptsInput] = useState(1);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedQuestions, setGeneratedQuestions] = useState([]);
    const [quizTitle, setQuizTitle] = useState('');
    const [quizStatus, setQuizStatus] = useState('published');
    const [isSaving, setIsSaving] = useState(false);

    // Assign Quiz Modal State (Multi-Quiz, Multi-Class, Multi-Group, Filtered/Persisted Students)
    const [assignQuizTargets, setAssignQuizTargets] = useState([]); // Array of quizzes to assign
    const [assignQuizSearch, setAssignQuizSearch] = useState('');
    const [classList, setClassList] = useState([]);
    const [selectedAssignClasses, setSelectedAssignClasses] = useState([]); // array of classIds
    const [assignClassSearch, setAssignClassSearch] = useState('');
    const [assignTargetType, setAssignTargetType] = useState('class'); // 'class' | 'group' | 'student'
    const [allClassGroups, setAllClassGroups] = useState([]); // { id, name, classId, className }
    const [selectedAssignGroups, setSelectedAssignGroups] = useState([]); // array of groupIds
    const [assignGroupSearch, setAssignGroupSearch] = useState('');
    const [allClassStudents, setAllClassStudents] = useState([]); // { id, firstName, lastName, email, studentId, classId, className }
    const [selectedAssignStudents, setSelectedAssignStudents] = useState([]); // array of studentIds (persisted!)
    const [studentClassFilter, setStudentClassFilter] = useState('all'); // 'all' or classId
    const [assignStudentSearch, setAssignStudentSearch] = useState('');
    const [activeAssignments, setActiveAssignments] = useState([]);
    const [isLoadingAssignments, setIsLoadingAssignments] = useState(false);
    const [isAssigning, setIsAssigning] = useState(false);

    // Original index maps to preserve pool order when unchecking
    const classOriginalIndexMap = useMemo(() => new Map(classList.map((c, i) => [c.id, i])), [classList]);
    const groupOriginalIndexMap = useMemo(() => new Map(allClassGroups.map((g, i) => [g.id, i])), [allClassGroups]);
    const studentOriginalIndexMap = useMemo(() => new Map(allClassStudents.map((s, i) => [s.id, i])), [allClassStudents]);

    // Submissions / Results Modal State (Admin/Instructor View)
    const [viewSubmissionsQuiz, setViewSubmissionsQuiz] = useState(null);
    const [submissionsData, setSubmissionsData] = useState(null);
    const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);
    const [expandedSubmissionIds, setExpandedSubmissionIds] = useState(new Set());

    const isInstructorOrAdmin = user && ['admin', 'instructor', 'principal', 'lab_assistant'].includes(user.role);

    useEffect(() => {
        if (!_hasHydrated) return;
        if (!isAuthenticated) {
            router.push('/login?redirect=/quiz');
            return;
        }
        fetchQuizzes();
        fetchMyResults();
    }, [_hasHydrated, isAuthenticated]);

    const fetchQuizzes = async () => {
        try {
            setIsLoadingQuizzes(true);
            const res = await quizAPI.getAll();
            if (res.data.success) {
                setQuizzes(res.data.data.quizzes || []);
            }
        } catch (err) {
            console.error('Failed to load quizzes', err);
        } finally {
            setIsLoadingQuizzes(false);
        }
    };

    const fetchMyResults = async () => {
        try {
            setIsLoadingResults(true);
            const res = await quizAPI.getMyResults();
            if (res.data.success) {
                setMyResults(res.data.data || []);
            }
        } catch (err) {
            console.error('Failed to load my results', err);
        } finally {
            setIsLoadingResults(false);
        }
    };

    const handleJoinWithCode = (e) => {
        e.preventDefault();
        const code = joinCodeInput.trim().toUpperCase();
        if (!code) {
            toast.error('Please enter a Quiz ID or Join Code');
            return;
        }
        router.push(`/quiz/join/${code}`);
    };

    const handleOpenShare = async (quiz) => {
        try {
            setShareQuiz(quiz);
            const url = `${window.location.origin}/quiz/join/${quiz.code || quiz.id}`;
            const qr = await QRCode.toDataURL(url, { width: 220, margin: 2 });
            setQrCodeDataUrl(qr);
        } catch (err) {
            console.error('QR code error', err);
        }
    };

    const handleCopyLink = () => {
        if (!shareQuiz) return;
        const url = `${window.location.origin}/quiz/join/${shareQuiz.code || shareQuiz.id}`;
        navigator.clipboard.writeText(url);
        setCopied(true);
        toast.success('Link copied to clipboard!');
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDeleteQuiz = async (quizId) => {
        if (!confirm('Are you sure you want to delete this quiz?')) return;
        try {
            const res = await quizAPI.delete(quizId);
            if (res.data.success) {
                toast.success('Quiz deleted');
                fetchQuizzes();
            }
        } catch (err) {
            console.error('Failed to delete quiz', err);
            toast.error('Failed to delete quiz');
        }
    };

    // Filtered quizzes based on search filter
    const filteredQuizzes = quizzes.filter(q => 
        !searchFilter || 
        q.title.toLowerCase().includes(searchFilter.toLowerCase()) || 
        q.code.includes(searchFilter.toUpperCase()) ||
        (q.keywords && q.keywords.toLowerCase().includes(searchFilter.toLowerCase()))
    );

    const totalQuizzes = filteredQuizzes.length;
    const totalPages = Math.max(1, Math.ceil(totalQuizzes / pageSize));

    // Clamp currentPage when filtered items shrink
    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [totalPages, currentPage]);

    // Reset page to 1 when search filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchFilter]);

    // Paginated slice for current page
    const paginatedQuizzes = filteredQuizzes.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize
    );

    // Selection helpers for bulk actions
    const isAllSelected = paginatedQuizzes.length > 0 && paginatedQuizzes.every(q => selectedQuizIds.has(q.id));
    const isSomeSelected = paginatedQuizzes.some(q => selectedQuizIds.has(q.id));

    const handleToggleSelectAll = () => {
        if (isAllSelected) {
            setSelectedQuizIds(prev => {
                const next = new Set(prev);
                paginatedQuizzes.forEach(q => next.delete(q.id));
                return next;
            });
        } else {
            setSelectedQuizIds(prev => {
                const next = new Set(prev);
                paginatedQuizzes.forEach(q => next.add(q.id));
                return next;
            });
        }
    };

    const handleToggleSelectOne = (quizId) => {
        setSelectedQuizIds(prev => {
            const next = new Set(prev);
            if (next.has(quizId)) next.delete(quizId);
            else next.add(quizId);
            return next;
        });
    };

    const handleSelectAllFiltered = () => {
        setSelectedQuizIds(new Set(filteredQuizzes.map(q => q.id)));
    };

    const handleClearSelection = () => {
        setSelectedQuizIds(new Set());
    };

    const handleBulkDelete = async () => {
        if (selectedQuizIds.size === 0) return;
        const count = selectedQuizIds.size;
        if (!confirm(`Are you sure you want to delete ${count} selected quiz${count > 1 ? 'zes' : ''}? This action cannot be undone.`)) {
            return;
        }
        try {
            setIsBulkDeleting(true);
            const res = await quizAPI.bulkDelete(Array.from(selectedQuizIds));
            if (res.data.success) {
                toast.success(`Deleted ${res.data.count || count} quizzes successfully`);
                setSelectedQuizIds(new Set());
                fetchQuizzes();
            }
        } catch (err) {
            console.error('Bulk delete failed, attempting fallback', err);
            try {
                let deletedCount = 0;
                for (const id of selectedQuizIds) {
                    await quizAPI.delete(id);
                    deletedCount++;
                }
                toast.success(`Deleted ${deletedCount} quizzes`);
                setSelectedQuizIds(new Set());
                fetchQuizzes();
            } catch (fallbackErr) {
                toast.error('Failed to delete some quizzes');
            }
        } finally {
            setIsBulkDeleting(false);
        }
    };

    const handlePageJump = (e) => {
        if (e) e.preventDefault();
        const pageNum = parseInt(pageJumperInput);
        if (isNaN(pageNum) || pageNum < 1 || pageNum > totalPages) {
            toast.error(`Please enter a page between 1 and ${totalPages}`);
            return;
        }
        setCurrentPage(pageNum);
        setPageJumperInput('');
    };

    // ============================================
    // EDIT QUIZ HANDLERS
    // ============================================
    const handleOpenEditQuiz = (quiz) => {
        setEditingQuiz(quiz);
        const standardKeys = ['A', 'B', 'C', 'D'];
        const safeQuestions = (Array.isArray(quiz.questions) ? quiz.questions : []).map((q, qIdx) => {
            const opts = (Array.isArray(q.options) ? q.options : []).map((opt, oIdx) => ({
                key: standardKeys[oIdx] || 'A',
                text: typeof opt === 'string' ? opt : (opt?.text || '')
            }));
            while (opts.length < 4) {
                opts.push({ key: standardKeys[opts.length], text: '' });
            }
            return {
                id: q.id || qIdx + 1,
                question: q.question || '',
                options: opts.slice(0, 4),
                correctOption: (q.correctOption || 'A').toUpperCase(),
                explanation: q.explanation || '',
                difficulty: q.difficulty || quiz.difficulty || 'medium',
                points: q.points || 1
            };
        });

        setEditFormData({
            title: quiz.title || '',
            description: quiz.description || '',
            keywords: quiz.keywords || '',
            difficulty: quiz.difficulty || 'medium',
            timeLimitMinutes: quiz.timeLimitMinutes || 10,
            maxAttempts: quiz.maxAttempts || 1,
            status: quiz.status || 'published',
            questions: safeQuestions
        });
        setExpandedQuestionIndices(new Set([0]));
        setShowAiAddPanel(false);
        setAiMoreKeywords(quiz.keywords || quiz.title || '');
        setAiMoreDifficulty(quiz.difficulty || 'medium');
        setAiMoreCount(3);
    };

    const handleUpdateQuestionField = (qIdx, field, value) => {
        setEditFormData(prev => {
            const updated = [...prev.questions];
            updated[qIdx] = { ...updated[qIdx], [field]: value };
            return { ...prev, questions: updated };
        });
    };

    const handleUpdateOptionText = (qIdx, optKey, text) => {
        setEditFormData(prev => {
            const updated = [...prev.questions];
            const q = { ...updated[qIdx] };
            q.options = q.options.map(opt => opt.key === optKey ? { ...opt, text } : opt);
            updated[qIdx] = q;
            return { ...prev, questions: updated };
        });
    };

    const handleSetCorrectOption = (qIdx, optKey) => {
        setEditFormData(prev => {
            const updated = [...prev.questions];
            updated[qIdx] = { ...updated[qIdx], correctOption: optKey };
            return { ...prev, questions: updated };
        });
    };

    const toggleQuestionExpanded = (qIdx) => {
        setExpandedQuestionIndices(prev => {
            const next = new Set(prev);
            if (next.has(qIdx)) next.delete(qIdx);
            else next.add(qIdx);
            return next;
        });
    };

    const handleExpandAllQuestions = () => {
        setExpandedQuestionIndices(new Set(editFormData.questions.map((_, idx) => idx)));
    };

    const handleCollapseAllQuestions = () => {
        setExpandedQuestionIndices(new Set());
    };

    const handleAddQuestionManual = () => {
        const newQ = {
            id: editFormData.questions.length + 1,
            question: '',
            options: [
                { key: 'A', text: '' },
                { key: 'B', text: '' },
                { key: 'C', text: '' },
                { key: 'D', text: '' },
            ],
            correctOption: 'A',
            explanation: '',
            difficulty: editFormData.difficulty || 'medium',
            points: 1
        };
        const updated = [...editFormData.questions, newQ];
        setEditFormData(prev => ({ ...prev, questions: updated }));
        setExpandedQuestionIndices(prev => new Set(prev).add(updated.length - 1));
        toast.success(`Question ${updated.length} added!`);
    };

    const handleAddMoreWithAI = async () => {
        const kw = (aiMoreKeywords || editFormData.keywords || editFormData.title || '').trim();
        if (!kw) {
            toast.error('Please enter keywords or topics for the new questions');
            return;
        }
        try {
            setIsGeneratingMoreAI(true);
            const res = await quizAPI.generate({
                keywords: kw,
                difficulty: aiMoreDifficulty,
                numberOfQuestions: Math.max(1, parseInt(aiMoreCount) || 3),
                timeLimitMinutes: editFormData.timeLimitMinutes || 10
            });
            if (res.data.success && Array.isArray(res.data.data.questions)) {
                const newQs = res.data.data.questions.map((q, idx) => ({
                    ...q,
                    id: editFormData.questions.length + idx + 1
                }));
                setEditFormData(prev => ({
                    ...prev,
                    questions: [...prev.questions, ...newQs]
                }));
                toast.success(`Added ${newQs.length} new AI-generated questions!`);
                setShowAiAddPanel(false);
            }
        } catch (err) {
            console.error('Failed to generate more questions with AI', err);
            toast.error(err.response?.data?.message || 'Failed to generate questions');
        } finally {
            setIsGeneratingMoreAI(false);
        }
    };

    const handleImproveQuestionWithAI = async (qIdx) => {
        const currentQ = editFormData.questions[qIdx];
        if (!currentQ || (!currentQ.question.trim() && !editFormData.keywords.trim())) {
            toast.error('Question must have some text or topic to improve');
            return;
        }
        try {
            setAiImprovingQuestionIdx(qIdx);
            const promptKeywords = currentQ.question.trim() || editFormData.keywords || editFormData.title;
            const res = await quizAPI.generate({
                keywords: promptKeywords,
                difficulty: currentQ.difficulty || editFormData.difficulty || 'medium',
                numberOfQuestions: 1,
                customInstructions: `Improve and rephrase this multiple-choice question: "${currentQ.question}". Ensure exactly 4 high quality options and a clear educational explanation.`
            });
            if (res.data.success && res.data.data.questions?.[0]) {
                const improved = res.data.data.questions[0];
                const updatedQuestions = [...editFormData.questions];
                updatedQuestions[qIdx] = {
                    ...updatedQuestions[qIdx],
                    question: improved.question,
                    options: improved.options,
                    correctOption: improved.correctOption,
                    explanation: improved.explanation || updatedQuestions[qIdx].explanation
                };
                setEditFormData(prev => ({ ...prev, questions: updatedQuestions }));
                toast.success(`Question #${qIdx + 1} refined with AI!`);
            }
        } catch (err) {
            console.error('Failed to improve question with AI', err);
            toast.error(err.response?.data?.message || 'Failed to refine question');
        } finally {
            setAiImprovingQuestionIdx(null);
        }
    };

    const handleDeleteQuestion = (qIdx) => {
        if (editFormData.questions.length <= 1) {
            toast.error('A quiz must have at least 1 question');
            return;
        }
        const filtered = editFormData.questions.filter((_, idx) => idx !== qIdx).map((q, idx) => ({
            ...q,
            id: idx + 1
        }));
        setEditFormData(prev => ({ ...prev, questions: filtered }));
        toast.success(`Removed question #${qIdx + 1}`);
    };

    const handleMoveQuestion = (fromIdx, toIdx) => {
        if (toIdx < 0 || toIdx >= editFormData.questions.length) return;
        const updated = [...editFormData.questions];
        const [moved] = updated.splice(fromIdx, 1);
        updated.splice(toIdx, 0, moved);
        const reindexed = updated.map((q, idx) => ({ ...q, id: idx + 1 }));
        setEditFormData(prev => ({ ...prev, questions: reindexed }));
        setExpandedQuestionIndices(new Set([toIdx]));
    };

    const handleSaveEditedQuiz = async () => {
        if (!editFormData.title.trim()) {
            toast.error('Please enter a quiz title');
            return;
        }
        if (editFormData.questions.length === 0) {
            toast.error('A quiz must have at least 1 question');
            return;
        }

        // Validate that questions are not completely empty
        for (let i = 0; i < editFormData.questions.length; i++) {
            const q = editFormData.questions[i];
            if (!q.question.trim()) {
                toast.error(`Question #${i + 1} prompt cannot be empty`);
                setExpandedQuestionIndices(prev => new Set(prev).add(i));
                return;
            }
            for (let j = 0; j < q.options.length; j++) {
                if (!q.options[j].text.trim()) {
                    toast.error(`Option ${q.options[j].key} in Question #${i + 1} cannot be empty`);
                    setExpandedQuestionIndices(prev => new Set(prev).add(i));
                    return;
                }
            }
        }

        try {
            setIsSavingEdit(true);
            const res = await quizAPI.update(editingQuiz.id, {
                title: editFormData.title.trim(),
                description: editFormData.description,
                keywords: editFormData.keywords.trim(),
                difficulty: editFormData.difficulty,
                timeLimitMinutes: Math.max(parseInt(editFormData.timeLimitMinutes) || 10, 1),
                maxAttempts: Math.max(parseInt(editFormData.maxAttempts) || 1, 1),
                questions: editFormData.questions,
                status: editFormData.status
            });
            if (res.data.success) {
                toast.success(`Quiz "${res.data.data.title}" updated successfully!`);
                setEditingQuiz(null);
                fetchQuizzes();
            }
        } catch (err) {
            console.error('Failed to update quiz', err);
            toast.error(err.response?.data?.message || 'Failed to update quiz');
        } finally {
            setIsSavingEdit(false);
        }
    };

    // Toggle Accordion in Student My Scores View
    const toggleResultAccordion = (resId) => {
        setExpandedResultIds(prev => {
            const next = new Set(prev);
            if (next.has(resId)) next.delete(resId);
            else next.add(resId);
            return next;
        });
    };

    // Toggle Accordion in Admin Submissions View
    const toggleSubmissionAccordion = (subId) => {
        setExpandedSubmissionIds(prev => {
            const next = new Set(prev);
            if (next.has(subId)) next.delete(subId);
            else next.add(subId);
            return next;
        });
    };

    // AI Generation inside Modal
    const handleGenerateAI = async () => {
        if (!keywords.trim()) {
            toast.error('Please enter keywords or topics');
            return;
        }
        try {
            setIsGenerating(true);
            const res = await quizAPI.generate({
                keywords: keywords.trim(),
                difficulty,
                numberOfQuestions: questionCount,
                timeLimitMinutes
            });
            if (res.data.success) {
                setGeneratedQuestions(res.data.data.questions || []);
                setQuizTitle(`Quiz: ${keywords.trim()}`);
                toast.success(`Generated ${res.data.data.questions.length} questions!`);
            }
        } catch (err) {
            console.error('Generation failed', err);
            toast.error(err.response?.data?.message || 'Failed to generate quiz');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSaveGeneratedQuiz = async () => {
        if (!quizTitle.trim()) {
            toast.error('Please enter a quiz title');
            return;
        }
        if (generatedQuestions.length === 0) {
            toast.error('Please generate questions first');
            return;
        }

        try {
            setIsSaving(true);
            const res = await quizAPI.create({
                title: quizTitle.trim(),
                keywords: keywords.trim(),
                difficulty,
                totalQuestions: generatedQuestions.length,
                timeLimitMinutes,
                maxAttempts: Math.max(parseInt(maxAttemptsInput) || 1, 1),
                questions: generatedQuestions,
                status: quizStatus
            });
            if (res.data.success) {
                toast.success(`Quiz "${res.data.data.title}" saved! Join Code: ${res.data.data.code}`);
                setShowCreateModal(false);
                setGeneratedQuestions([]);
                setKeywords('');
                setMaxAttemptsInput(1);
                fetchQuizzes();
                handleOpenShare(res.data.data);
            }
        } catch (err) {
            console.error('Failed to save quiz', err);
            toast.error(err.response?.data?.message || 'Failed to save quiz');
        } finally {
            setIsSaving(false);
        }
    };

    // Open Assign Modal for a single quiz
    const handleOpenAssignModal = async (quiz) => {
        setAssignQuizTargets([quiz]);
        await initializeAssignModalData([quiz]);
    };

    // Open Assign Modal for multiple selected quizzes (bulk)
    const handleOpenBulkAssignModal = async () => {
        const selectedList = quizzes.filter(q => selectedQuizIds.has(q.id));
        if (selectedList.length === 0) {
            toast.error('Please select at least one quiz to assign');
            return;
        }
        setAssignQuizTargets(selectedList);
        await initializeAssignModalData(selectedList);
    };

    // Add or remove a quiz from the targets in the modal
    const handleAddQuizToAssignTargets = (quiz) => {
        if (!assignQuizTargets.some(q => q.id === quiz.id)) {
            setAssignQuizTargets(prev => [...prev, quiz]);
        }
        setAssignQuizSearch('');
    };

    const handleRemoveQuizFromAssignTargets = (quizId) => {
        if (assignQuizTargets.length <= 1) {
            toast.error('At least one quiz must be selected for assignment');
            return;
        }
        setAssignQuizTargets(prev => prev.filter(q => q.id !== quizId));
    };

    // Initialize assign modal data
    const initializeAssignModalData = async (targetQuizzes) => {
        setSelectedAssignClasses([]);
        setSelectedAssignGroups([]);
        setSelectedAssignStudents([]);
        setAssignClassSearch('');
        setAssignGroupSearch('');
        setAssignStudentSearch('');
        setStudentClassFilter('all');
        setAssignTargetType('class');
        setActiveAssignments([]);
        setIsLoadingAssignments(true);

        try {
            const [classesRes, assignRes] = await Promise.all([
                classesAPI.getAll(),
                targetQuizzes.length === 1 ? quizAPI.getAssignments(targetQuizzes[0].id) : Promise.resolve({ data: { data: [] } })
            ]);

            const loadedClasses = classesRes.data?.data?.classes || classesRes.data?.data || classesRes.data?.classes || [];
            setClassList(loadedClasses);

            if (assignRes.data?.success) {
                const existing = assignRes.data.data || [];
                setActiveAssignments(existing);
                const existingClassIds = existing.filter(a => a.targetType === 'class' && a.targetClassId).map(a => a.targetClassId);
                const existingGroupIds = existing.filter(a => a.targetType === 'group' && a.targetGroupId).map(a => a.targetGroupId);
                const existingStudentIds = existing.filter(a => a.targetType === 'student' && a.targetStudentId).map(a => a.targetStudentId);

                setSelectedAssignClasses(existingClassIds);
                setSelectedAssignGroups(existingGroupIds);
                setSelectedAssignStudents(existingStudentIds);
            }

            if (loadedClasses.length > 0) {
                await loadAllClassesData(loadedClasses);
            }
        } catch (err) {
            console.error('Failed to load assignment data', err);
            toast.error('Failed to load classes or assignments');
        } finally {
            setIsLoadingAssignments(false);
        }
    };

    // Load groups and students across all classes
    const loadAllClassesData = async (classes) => {
        try {
            const groupFetches = classes.map(c =>
                classesAPI.getGroups(c.id)
                    .then(res => {
                        const grps = res.data?.data?.groups || res.data?.data || [];
                        return grps.map(g => ({
                            ...g,
                            classId: c.id,
                            className: `${c.name} ${c.section ? `(${c.section})` : ''}`
                        }));
                    })
                    .catch(() => [])
            );

            const studentFetches = classes.map(c =>
                classesAPI.getStudents(c.id)
                    .then(res => {
                        const stds = res.data?.data?.students || res.data?.data || [];
                        return stds.map(s => ({
                            ...s,
                            classId: c.id,
                            className: `${c.name} ${c.section ? `(${c.section})` : ''}`
                        }));
                    })
                    .catch(() => [])
            );

            const [groupsArrays, studentsArrays] = await Promise.all([
                Promise.all(groupFetches),
                Promise.all(studentFetches)
            ]);

            setAllClassGroups(groupsArrays.flat());

            const studentMap = new Map();
            studentsArrays.flat().forEach(s => {
                if (!studentMap.has(s.id)) {
                    studentMap.set(s.id, s);
                }
            });
            setAllClassStudents(Array.from(studentMap.values()));
        } catch (err) {
            console.error('Failed to load class groups or students', err);
        }
    };

    // Class selection handlers
    const handleToggleClassSelection = (classId) => {
        setSelectedAssignClasses(prev =>
            prev.includes(classId) ? prev.filter(id => id !== classId) : [...prev, classId]
        );
    };

    const handleSelectAllFilteredClasses = (filteredClasses) => {
        const ids = filteredClasses.map(c => c.id);
        setSelectedAssignClasses(prev => Array.from(new Set([...prev, ...ids])));
    };

    const handleDeselectFilteredClasses = (filteredClasses) => {
        const idSet = new Set(filteredClasses.map(c => c.id));
        setSelectedAssignClasses(prev => prev.filter(id => !idSet.has(id)));
    };

    // Group selection handlers
    const handleToggleGroupSelection = (groupId) => {
        setSelectedAssignGroups(prev =>
            prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId]
        );
    };

    const handleSelectAllFilteredGroups = (filteredGroups) => {
        const ids = filteredGroups.map(g => g.id);
        setSelectedAssignGroups(prev => Array.from(new Set([...prev, ...ids])));
    };

    const handleDeselectFilteredGroups = (filteredGroups) => {
        const idSet = new Set(filteredGroups.map(g => g.id));
        setSelectedAssignGroups(prev => prev.filter(id => !idSet.has(id)));
    };

    // Student selection handlers (PERSISTENT across class filter and search!)
    const handleToggleStudentSelection = (studentId) => {
        setSelectedAssignStudents(prev =>
            prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]
        );
    };

    const handleSelectAllFilteredStudents = (filteredStudents) => {
        const ids = filteredStudents.map(s => s.id);
        setSelectedAssignStudents(prev => Array.from(new Set([...prev, ...ids])));
    };

    const handleDeselectFilteredStudents = (filteredStudents) => {
        const idSet = new Set(filteredStudents.map(s => s.id));
        setSelectedAssignStudents(prev => prev.filter(id => !idSet.has(id)));
    };

    const handleClearAllSelectedStudents = () => {
        setSelectedAssignStudents([]);
    };

    // Save Assignment (to Classes, Groups, and/or Students)
    const handleSaveAssignment = async () => {
        if (assignQuizTargets.length === 0) {
            toast.error('No quiz selected');
            return;
        }

        const hasClass = selectedAssignClasses.length > 0;
        const hasGroup = selectedAssignGroups.length > 0;
        const hasStudent = selectedAssignStudents.length > 0;

        if (!hasClass && !hasGroup && !hasStudent) {
            toast.error('Please select at least one class, group, or student to assign');
            return;
        }

        try {
            setIsAssigning(true);
            const payload = {
                targetType: 'multi',
                targetClassIds: selectedAssignClasses,
                targetGroupIds: selectedAssignGroups,
                targetStudentIds: selectedAssignStudents
            };

            if (assignQuizTargets.length === 1) {
                await quizAPI.assign(assignQuizTargets[0].id, payload);
            } else {
                await quizAPI.bulkAssign({
                    quizIds: assignQuizTargets.map(q => q.id),
                    ...payload
                });
            }

            const targetSummary = [
                hasClass ? `${selectedAssignClasses.length} class(es)` : null,
                hasGroup ? `${selectedAssignGroups.length} group(s)` : null,
                hasStudent ? `${selectedAssignStudents.length} student(s)` : null
            ].filter(Boolean).join(', ');

            toast.success(`Successfully assigned to ${targetSummary}!`);

            // Refresh active assignments if single quiz
            if (assignQuizTargets.length === 1) {
                const updated = await quizAPI.getAssignments(assignQuizTargets[0].id);
                if (updated.data?.success) {
                    setActiveAssignments(updated.data.data || []);
                }
            }

            fetchQuizzes();
        } catch (err) {
            console.error('Failed to assign quiz', err);
            toast.error(err.response?.data?.message || 'Failed to assign quiz');
        } finally {
            setIsAssigning(false);
        }
    };

    const handleRemoveAssignment = async (assignmentId) => {
        const targetQuizId = assignQuizTargets[0]?.id;
        if (!targetQuizId) return;
        try {
            const res = await quizAPI.deleteAssignment(targetQuizId, assignmentId);
            if (res.data.success) {
                toast.success('Assignment removed');
                setActiveAssignments(prev => prev.filter(a => a.id !== assignmentId));
                fetchQuizzes();
            }
        } catch (err) {
            console.error('Failed to remove assignment', err);
            toast.error('Failed to remove assignment');
        }
    };

    // Open Submissions / Leaderboard Modal for Admin/Instructor
    const handleOpenSubmissionsModal = async (quiz) => {
        setViewSubmissionsQuiz(quiz);
        setSubmissionsData(null);
        setExpandedSubmissionIds(new Set());
        try {
            setIsLoadingSubmissions(true);
            const res = await quizAPI.getResults(quiz.id);
            if (res.data.success) {
                setSubmissionsData(res.data.data);
            }
        } catch (err) {
            console.error('Failed to load submissions', err);
            toast.error('Failed to load quiz submissions');
        } finally {
            setIsLoadingSubmissions(false);
        }
    };

    if (!_hasHydrated) return null;

    const pageTitle = isInstructorOrAdmin ? 'AI Quiz Maker' : 'Quizzes & Tests';
    const pageSubtitle = isInstructorOrAdmin
        ? 'Create, assign, and track multiple-choice assessments'
        : 'Take assigned quizzes and review your performance';

    return (
        <div className="min-h-screen bg-[#F3F2EF] dark:bg-slate-950 pb-12">
            {/* Standard Page Header */}
            <PageHeader title={pageTitle} titleHindi={isInstructorOrAdmin ? 'एआई क्विज़ मेकर' : 'क्विज़ और परीक्षाएं'}>
                {isInstructorOrAdmin && (
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="py-2 px-3.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-xs shadow-sm transition flex items-center justify-center gap-1.5"
                    >
                        <Sparkles className="w-4 h-4" />
                        Create AI Quiz
                    </button>
                )}
            </PageHeader>

            <main className="max-w-7xl mx-auto px-4 lg:px-6 py-6 space-y-6">

                {/* Quick Join Card */}
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-950/40 text-primary-600 flex items-center justify-center">
                            <Play className="w-5 h-5 fill-current" />
                        </div>
                        <div>
                            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Join with Code</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Have a 6-character Quiz Code? Enter it below to begin.</p>
                        </div>
                    </div>
                    <form onSubmit={handleJoinWithCode} className="flex items-center gap-2 w-full sm:w-auto">
                        <input
                            type="text"
                            value={joinCodeInput}
                            onChange={(e) => setJoinCodeInput(e.target.value)}
                            placeholder="Enter Code (e.g. 8K2P9X)"
                            className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2 text-xs text-slate-900 dark:text-white uppercase font-mono tracking-wider placeholder-slate-400 focus:outline-none focus:border-primary-500 w-full sm:w-56"
                        />
                        <button
                            type="submit"
                            className="py-2 px-4 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-sm flex-shrink-0"
                        >
                            Join <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                    </form>
                </div>

                {/* Navigation Tabs */}
                <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                    <button
                        onClick={() => setActiveTab('created')}
                        className={`py-2 px-4 rounded-xl text-xs font-bold transition ${
                            activeTab === 'created'
                                ? 'bg-primary-600 text-white shadow-sm'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800'
                        }`}
                    >
                        {isInstructorOrAdmin ? `All Quizzes (${quizzes.length})` : `Assigned Quizzes (${quizzes.length})`}
                    </button>
                    <button
                        onClick={() => setActiveTab('completed')}
                        className={`py-2 px-4 rounded-xl text-xs font-bold transition ${
                            activeTab === 'completed'
                                ? 'bg-primary-600 text-white shadow-sm'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800'
                        }`}
                    >
                        My Scores & Results ({myResults.length})
                    </button>
                </div>

                {/* TAB 1: AVAILABLE / ASSIGNED QUIZZES */}
                {activeTab === 'created' && (
                    <div className="space-y-4">
                        {/* Toolbar: Search, View Mode, Items per page, Refresh */}
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="relative flex-1 min-w-[200px] max-w-md">
                                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    value={searchFilter}
                                    onChange={(e) => setSearchFilter(e.target.value)}
                                    placeholder="Search by title, topic, or code..."
                                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-primary-500 shadow-sm"
                                />
                            </div>

                            <div className="flex items-center gap-2.5">
                                {/* Items per page */}
                                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                                    <span className="hidden sm:inline">Show:</span>
                                    <select
                                        value={pageSize}
                                        onChange={(e) => {
                                            setPageSize(Number(e.target.value));
                                            setCurrentPage(1);
                                        }}
                                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-primary-500 shadow-sm"
                                    >
                                        <option value={6}>6</option>
                                        <option value={9}>9</option>
                                        <option value={12}>12</option>
                                        <option value={24}>24</option>
                                        <option value={48}>48</option>
                                    </select>
                                </div>

                                {/* View Switcher: Grid vs List */}
                                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                    <button
                                        type="button"
                                        onClick={() => setViewMode('grid')}
                                        className={`p-1.5 rounded-lg transition ${
                                            viewMode === 'grid'
                                                ? 'bg-white dark:bg-slate-900 text-primary-600 dark:text-primary-400 shadow-xs'
                                                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                                        }`}
                                        title="Grid View"
                                    >
                                        <LayoutGrid className="w-4 h-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setViewMode('list')}
                                        className={`p-1.5 rounded-lg transition ${
                                            viewMode === 'list'
                                                ? 'bg-white dark:bg-slate-900 text-primary-600 dark:text-primary-400 shadow-xs'
                                                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                                        }`}
                                        title="List View"
                                    >
                                        <List className="w-4 h-4" />
                                    </button>
                                </div>

                                <button
                                    onClick={fetchQuizzes}
                                    className="p-2 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl transition border border-slate-200 dark:border-slate-700 shadow-sm"
                                    title="Refresh Quizzes"
                                >
                                    <RefreshCw className={`w-4 h-4 ${isLoadingQuizzes ? 'animate-spin' : ''}`} />
                                </button>
                            </div>
                        </div>

                        {/* Bulk Action / Selection Bar (when instructor/admin) */}
                        {isInstructorOrAdmin && filteredQuizzes.length > 0 && (
                            <div className="flex flex-wrap items-center justify-between gap-2.5 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs">
                                <div className="flex items-center gap-3">
                                    <label className="flex items-center gap-2 cursor-pointer select-none font-semibold text-slate-700 dark:text-slate-300">
                                        <input
                                            type="checkbox"
                                            checked={isAllSelected}
                                            onChange={handleToggleSelectAll}
                                            className="w-4 h-4 text-primary-600 rounded border-slate-300 dark:border-slate-700 cursor-pointer"
                                        />
                                        <span>Select All ({paginatedQuizzes.length} on page)</span>
                                    </label>
                                    {selectedQuizIds.size > 0 && selectedQuizIds.size < totalQuizzes && (
                                        <button
                                            type="button"
                                            onClick={handleSelectAllFiltered}
                                            className="text-primary-600 dark:text-primary-400 hover:underline font-bold"
                                        >
                                            Select all {totalQuizzes} quizzes across pages
                                        </button>
                                    )}
                                </div>

                                {selectedQuizIds.size > 0 && (
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700">
                                            {selectedQuizIds.size} selected
                                        </span>
                                        <button
                                            type="button"
                                            onClick={handleClearSelection}
                                            className="py-1 px-2.5 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-xl transition"
                                        >
                                            Clear
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleOpenBulkAssignModal}
                                            className="py-1 px-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold transition flex items-center gap-1.5 shadow-sm"
                                            title="Assign selected quizzes to classes, groups, or students"
                                        >
                                            <Users className="w-3.5 h-3.5" />
                                            Assign Selected ({selectedQuizIds.size})
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleBulkDelete}
                                            disabled={isBulkDeleting}
                                            className="py-1 px-3 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl font-bold transition flex items-center gap-1.5 shadow-sm"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                            {isBulkDeleting ? 'Deleting...' : `Delete Selected (${selectedQuizIds.size})`}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {isLoadingQuizzes ? (
                            <div className="py-16 text-center text-slate-500 text-xs animate-pulse">
                                Loading quizzes...
                            </div>
                        ) : filteredQuizzes.length === 0 ? (
                            <div className="py-16 text-center space-y-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-8">
                                <HelpCircle className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
                                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                    {searchFilter ? 'No matching quizzes found' : (isInstructorOrAdmin ? 'No Quizzes Created Yet' : 'No Quizzes Assigned to You')}
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                                    {searchFilter 
                                        ? 'Try searching with a different keyword, topic, or quiz code.'
                                        : (isInstructorOrAdmin 
                                            ? 'Click "Create AI Quiz" to generate an assessment with AI and assign it to classes or students.' 
                                            : 'Any quizzes assigned to your class or group by your instructor will appear here.')}
                                </p>
                            </div>
                        ) : viewMode === 'grid' ? (
                            /* GRID VIEW */
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {paginatedQuizzes.map((quiz) => {
                                    const isSelected = selectedQuizIds.has(quiz.id);
                                    return (
                                        <div
                                            key={quiz.id}
                                            className={`bg-white dark:bg-slate-800 border rounded-2xl p-5 space-y-4 hover:border-primary-400 dark:hover:border-primary-500 transition shadow-sm group flex flex-col justify-between ${
                                                isSelected 
                                                    ? 'border-primary-500 dark:border-primary-500 ring-2 ring-primary-500/20' 
                                                    : 'border-slate-200 dark:border-slate-700'
                                            }`}
                                        >
                                            <div className="space-y-2.5">
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="flex items-center gap-2">
                                                        {isInstructorOrAdmin && (
                                                            <input
                                                                type="checkbox"
                                                                checked={isSelected}
                                                                onChange={() => handleToggleSelectOne(quiz.id)}
                                                                className="w-4 h-4 text-primary-600 rounded border-slate-300 dark:border-slate-700 cursor-pointer"
                                                                title="Select quiz"
                                                            />
                                                        )}
                                                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                                                            quiz.status === 'published'
                                                                ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700/40'
                                                                : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700/40'
                                                        }`}>
                                                            {quiz.status}
                                                        </span>
                                                    </div>
                                                    <span className="font-mono text-xs font-bold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/40 px-2 py-0.5 rounded border border-primary-200 dark:border-primary-800">
                                                        {quiz.code}
                                                    </span>
                                                </div>

                                                <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug group-hover:text-primary-600 transition">
                                                    {quiz.title}
                                                </h3>

                                                {quiz.keywords && (
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                                                        Topic: {quiz.keywords}
                                                    </p>
                                                )}

                                                <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400 pt-1">
                                                    <span className="flex items-center gap-1 font-medium">
                                                        <HelpCircle className="w-3.5 h-3.5 text-primary-500" />
                                                        {quiz.totalQuestions} Questions
                                                    </span>
                                                    <span className="w-1 h-1 bg-slate-300 dark:bg-slate-600 rounded-full" />
                                                    <span className="flex items-center gap-1 font-medium">
                                                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                                                        {quiz.timeLimitMinutes} Mins
                                                    </span>
                                                    <span className="w-1 h-1 bg-slate-300 dark:bg-slate-600 rounded-full" />
                                                    <span className="font-medium text-[11px] text-slate-600 dark:text-slate-300">
                                                        Max Attempts: {quiz.maxAttempts || 1}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="pt-3 border-t border-slate-100 dark:border-slate-700/80 flex items-center gap-2">
                                                <button
                                                    onClick={() => router.push(`/quiz/join/${quiz.code}`)}
                                                    className="flex-1 py-2 px-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 shadow-sm"
                                                >
                                                    <Play className="w-3.5 h-3.5 fill-current" />
                                                    Take Quiz
                                                </button>

                                                {/* Staff Actions: Edit, Assign, Submissions, Delete */}
                                                {isInstructorOrAdmin && (
                                                    <>
                                                        <button
                                                            onClick={() => handleOpenEditQuiz(quiz)}
                                                            className="p-2 bg-slate-100 dark:bg-slate-700 hover:bg-amber-50 hover:text-amber-600 text-slate-700 dark:text-slate-300 rounded-xl transition"
                                                            title="Edit Quiz & Questions"
                                                        >
                                                            <Edit3 className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleOpenAssignModal(quiz)}
                                                            className="p-2 bg-slate-100 dark:bg-slate-700 hover:bg-primary-50 hover:text-primary-600 text-slate-700 dark:text-slate-300 rounded-xl transition"
                                                            title="Assign Quiz to Class/Group/Student"
                                                        >
                                                            <Users className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleOpenSubmissionsModal(quiz)}
                                                            className="p-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl transition"
                                                            title="View Student Submissions & Responses"
                                                        >
                                                            <BarChart3 className="w-4 h-4" />
                                                        </button>
                                                    </>
                                                )}

                                                <button
                                                    onClick={() => handleOpenShare(quiz)}
                                                    className="p-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl transition"
                                                    title="Share Code & QR"
                                                >
                                                    <Share2 className="w-4 h-4" />
                                                </button>

                                                {isInstructorOrAdmin && (
                                                    <button
                                                        onClick={() => handleDeleteQuiz(quiz.id)}
                                                        className="p-2 bg-slate-100 dark:bg-slate-700 hover:bg-rose-50 hover:text-rose-600 text-slate-500 rounded-xl transition"
                                                        title="Delete Quiz"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            /* LIST VIEW */
                            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse text-xs">
                                        <thead>
                                            <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                                                {isInstructorOrAdmin && (
                                                    <th className="p-3.5 w-10 text-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={isAllSelected}
                                                            onChange={handleToggleSelectAll}
                                                            className="w-4 h-4 text-primary-600 rounded border-slate-300 dark:border-slate-700 cursor-pointer"
                                                            title={isAllSelected ? 'Deselect All' : 'Select All'}
                                                        />
                                                    </th>
                                                )}
                                                <th className="p-3.5">Code</th>
                                                <th className="p-3.5">Title & Topic</th>
                                                <th className="p-3.5 text-center">Questions</th>
                                                <th className="p-3.5 text-center">Time</th>
                                                <th className="p-3.5 text-center">Attempts</th>
                                                <th className="p-3.5 text-center">Status</th>
                                                <th className="p-3.5 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                                            {paginatedQuizzes.map((quiz) => {
                                                const isSelected = selectedQuizIds.has(quiz.id);
                                                return (
                                                    <tr 
                                                        key={quiz.id}
                                                        className={`hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition ${
                                                            isSelected ? 'bg-primary-50/40 dark:bg-primary-950/20' : ''
                                                        }`}
                                                    >
                                                        {isInstructorOrAdmin && (
                                                            <td className="p-3.5 text-center">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isSelected}
                                                                    onChange={() => handleToggleSelectOne(quiz.id)}
                                                                    className="w-4 h-4 text-primary-600 rounded border-slate-300 dark:border-slate-700 cursor-pointer"
                                                                />
                                                            </td>
                                                        )}
                                                        <td className="p-3.5">
                                                            <span className="font-mono font-bold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/40 px-2 py-0.5 rounded border border-primary-200 dark:border-primary-800 text-[11px]">
                                                                {quiz.code}
                                                            </span>
                                                        </td>
                                                        <td className="p-3.5">
                                                            <div className="font-bold text-slate-900 dark:text-white leading-tight">
                                                                {quiz.title}
                                                            </div>
                                                            {quiz.keywords && (
                                                                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-xs mt-0.5">
                                                                    {quiz.keywords}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="p-3.5 text-center font-semibold text-slate-700 dark:text-slate-300">
                                                            {quiz.totalQuestions}
                                                        </td>
                                                        <td className="p-3.5 text-center text-slate-600 dark:text-slate-400 font-medium">
                                                            {quiz.timeLimitMinutes}m
                                                        </td>
                                                        <td className="p-3.5 text-center text-slate-600 dark:text-slate-400 font-medium">
                                                            {quiz.maxAttempts || 1}
                                                        </td>
                                                        <td className="p-3.5 text-center">
                                                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                                                                quiz.status === 'published'
                                                                    ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700/40'
                                                                    : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700/40'
                                                            }`}>
                                                                {quiz.status}
                                                            </span>
                                                        </td>
                                                        <td className="p-3.5 text-right">
                                                            <div className="flex items-center justify-end gap-1.5">
                                                                <button
                                                                    onClick={() => router.push(`/quiz/join/${quiz.code}`)}
                                                                    className="py-1 px-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-xs"
                                                                    title="Take Quiz"
                                                                >
                                                                    <Play className="w-3 h-3 fill-current" />
                                                                    Take
                                                                </button>
                                                                {isInstructorOrAdmin && (
                                                                    <>
                                                                        <button
                                                                            onClick={() => handleOpenEditQuiz(quiz)}
                                                                            className="p-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-amber-50 hover:text-amber-600 text-slate-700 dark:text-slate-300 rounded-lg transition"
                                                                            title="Edit Quiz & Questions"
                                                                        >
                                                                            <Edit3 className="w-3.5 h-3.5" />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleOpenAssignModal(quiz)}
                                                                            className="p-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-primary-50 hover:text-primary-600 text-slate-700 dark:text-slate-300 rounded-lg transition"
                                                                            title="Assign to Class/Group/Student"
                                                                        >
                                                                            <Users className="w-3.5 h-3.5" />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleOpenSubmissionsModal(quiz)}
                                                                            className="p-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-lg transition"
                                                                            title="View Submissions"
                                                                        >
                                                                            <BarChart3 className="w-3.5 h-3.5" />
                                                                        </button>
                                                                    </>
                                                                )}
                                                                <button
                                                                    onClick={() => handleOpenShare(quiz)}
                                                                    className="p-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-lg transition"
                                                                    title="Share Code & QR"
                                                                >
                                                                    <Share2 className="w-3.5 h-3.5" />
                                                                </button>
                                                                {isInstructorOrAdmin && (
                                                                    <button
                                                                        onClick={() => handleDeleteQuiz(quiz.id)}
                                                                        className="p-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-rose-50 hover:text-rose-600 text-slate-500 rounded-lg transition"
                                                                        title="Delete Quiz"
                                                                    >
                                                                        <Trash2 className="w-3.5 h-3.5" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* PAGINATION & PAGE JUMPER */}
                        {!isLoadingQuizzes && totalQuizzes > 0 && (
                            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800 text-xs">
                                <div className="text-slate-500 dark:text-slate-400">
                                    Showing <span className="font-semibold text-slate-700 dark:text-slate-200">{(currentPage - 1) * pageSize + 1}</span> to <span className="font-semibold text-slate-700 dark:text-slate-200">{Math.min(currentPage * pageSize, totalQuizzes)}</span> of <span className="font-semibold text-slate-700 dark:text-slate-200">{totalQuizzes}</span> quizzes
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                    {/* Pagination Controls */}
                                    <div className="flex items-center gap-1">
                                        <button
                                            type="button"
                                            onClick={() => setCurrentPage(1)}
                                            disabled={currentPage === 1}
                                            className="p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-40 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                                            title="First Page"
                                        >
                                            <ChevronsLeft className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                            disabled={currentPage === 1}
                                            className="p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-40 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                                            title="Previous Page"
                                        >
                                            <ChevronLeft className="w-3.5 h-3.5" />
                                        </button>

                                        {/* Page Numbers */}
                                        <div className="flex items-center gap-1 px-1">
                                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                                                .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                                                .reduce((acc, p, idx, arr) => {
                                                    if (idx > 0 && p - arr[idx - 1] > 1) {
                                                        acc.push('ellipsis-' + p);
                                                    }
                                                    acc.push(p);
                                                    return acc;
                                                }, [])
                                                .map(item => {
                                                    if (typeof item === 'string') {
                                                        return <span key={item} className="px-1 text-slate-400">...</span>;
                                                    }
                                                    return (
                                                        <button
                                                            key={item}
                                                            type="button"
                                                            onClick={() => setCurrentPage(item)}
                                                            className={`min-w-[28px] h-7 px-1.5 rounded-lg font-bold text-xs transition ${
                                                                currentPage === item
                                                                    ? 'bg-primary-600 text-white shadow-xs'
                                                                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                                                            }`}
                                                        >
                                                            {item}
                                                        </button>
                                                    );
                                                })}
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                            disabled={currentPage === totalPages}
                                            className="p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-40 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                                            title="Next Page"
                                        >
                                            <ChevronRight className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setCurrentPage(totalPages)}
                                            disabled={currentPage === totalPages}
                                            className="p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-40 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                                            title="Last Page"
                                        >
                                            <ChevronsRight className="w-3.5 h-3.5" />
                                        </button>
                                    </div>

                                    {/* Page Jumper */}
                                    <form onSubmit={handlePageJump} className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 pl-2 sm:border-l sm:border-slate-200 sm:dark:border-slate-700">
                                        <span className="hidden sm:inline">Page:</span>
                                        <input
                                            type="number"
                                            min={1}
                                            max={totalPages}
                                            value={pageJumperInput}
                                            onChange={(e) => setPageJumperInput(e.target.value)}
                                            placeholder={String(currentPage)}
                                            className="w-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-1.5 py-1 text-center font-bold text-slate-900 dark:text-white focus:outline-none focus:border-primary-500"
                                        />
                                        <span className="text-[11px]">/ {totalPages}</span>
                                        <button
                                            type="submit"
                                            className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-primary-50 hover:text-primary-600 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg font-bold transition"
                                        >
                                            Go
                                        </button>
                                    </form>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 2: MY RESULTS & SCROLLABLE COLLAPSIBLE RESPONSES */}
                {activeTab === 'completed' && (
                    <div className="space-y-4">
                        {isLoadingResults ? (
                            <div className="py-16 text-center text-slate-500 text-xs animate-pulse">
                                Loading scores...
                            </div>
                        ) : myResults.length === 0 ? (
                            <div className="py-16 text-center space-y-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-8">
                                <Award className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
                                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Completed Quizzes</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                                    Take an assigned quiz or join with a code to test your knowledge!
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {myResults.map((res) => {
                                    const isExpanded = expandedResultIds.has(res.id);
                                    const answersList = Array.isArray(res.answers) ? res.answers : [];

                                    return (
                                        <div
                                            key={res.id}
                                            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4.5 shadow-sm space-y-3 transition"
                                        >
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                                                            {res.quiz?.title || 'Assessment Quiz'}
                                                        </h4>
                                                        <span className="text-[10px] font-mono text-primary-600 bg-primary-50 dark:bg-primary-950/40 px-1.5 py-0.5 rounded border border-primary-200 dark:border-primary-800">
                                                            {res.quiz?.code}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                                        Completed: {new Date(res.submittedAt).toLocaleDateString()} • Time Taken: {Math.floor(res.timeTakenSeconds / 60)}m {res.timeTakenSeconds % 60}s
                                                    </p>
                                                </div>

                                                <div className="flex items-center gap-4">
                                                    <div className="text-right">
                                                        <div className="text-base font-extrabold text-primary-600">
                                                            {res.score} / {res.totalQuestions}
                                                        </div>
                                                        <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                                            {res.percentage}% Accuracy
                                                        </div>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={() => setReviewModalSubmission({
                                                            ...res,
                                                            userName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'My Submission',
                                                            quizTitle: res.quiz?.title,
                                                            quizCode: res.quiz?.code
                                                        })}
                                                        className="py-1.5 px-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                                                    >
                                                        <LayoutGrid className="w-3.5 h-3.5" />
                                                        Question Palette
                                                    </button>

                                                    <button
                                                        onClick={() => toggleResultAccordion(res.id)}
                                                        className="py-1.5 px-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
                                                    >
                                                        {isExpanded ? 'Hide List' : 'Quick List'}
                                                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                                    </button>
                                                </div>
                                            </div>

                                            {/* SCROLLABLE COLLAPSIBLE FOR STUDENT RESPONSES */}
                                            {isExpanded && (
                                                <div className="pt-3 border-t border-slate-100 dark:border-slate-700">
                                                    <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                                                        Question-by-Question Review ({answersList.length} Questions)
                                                    </h5>
                                                    <div className="max-h-80 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
                                                        {answersList.length === 0 ? (
                                                            <p className="text-xs text-slate-400 py-2">Detailed question breakdown not recorded for this test.</p>
                                                        ) : (
                                                            answersList.map((ans, idx) => (
                                                                <div
                                                                    key={idx}
                                                                    className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                                                                        ans.isCorrect
                                                                            ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40 text-slate-800 dark:text-emerald-200'
                                                                            : 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/40 text-slate-800 dark:text-rose-200'
                                                                    }`}
                                                                >
                                                                    {/* Question Title */}
                                                                    <div className="flex items-start justify-between gap-2.5 font-bold">
                                                                        <div className="flex-1">
                                                                            <span className="text-slate-400 mr-1.5">Q{idx + 1}:</span>
                                                                            <MathRenderer content={ans.questionText} inline />
                                                                        </div>
                                                                        {ans.isCorrect ? (
                                                                            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold shrink-0">
                                                                                <CheckCircle2 className="w-3.5 h-3.5" /> Correct
                                                                            </span>
                                                                        ) : (
                                                                            <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-bold shrink-0">
                                                                                <XCircle className="w-3.5 h-3.5" /> Incorrect
                                                                            </span>
                                                                        )}
                                                                    </div>

                                                                    {/* All 4 Choices with Green / Red Response Highlighting */}
                                                                    {ans.options && ans.options.length > 0 ? (
                                                                        <div className="space-y-1.5 pt-1">
                                                                            {ans.options.map((opt) => {
                                                                                const optKey = String(opt.key || '').toUpperCase();
                                                                                const isUserSelected = optKey === String(ans.selectedOption || '').toUpperCase();
                                                                                const isCorrectOption = optKey === String(ans.correctOption || '').toUpperCase();

                                                                                let badgeClass = 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700';
                                                                                let pillClass = 'bg-white/80 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300';

                                                                                if (isCorrectOption) {
                                                                                    pillClass = 'bg-emerald-500/15 border-emerald-500 text-emerald-900 dark:text-emerald-200 font-semibold ring-1 ring-emerald-500/40';
                                                                                    badgeClass = 'bg-emerald-600 text-white border-emerald-600';
                                                                                } else if (isUserSelected && !isCorrectOption) {
                                                                                    pillClass = 'bg-rose-500/15 border-rose-500 text-rose-900 dark:text-rose-200 font-semibold ring-1 ring-rose-500/40';
                                                                                    badgeClass = 'bg-rose-600 text-white border-rose-600';
                                                                                }

                                                                                return (
                                                                                    <div
                                                                                        key={optKey}
                                                                                        className={`p-2 rounded-xl border flex items-center justify-between gap-2 text-xs transition-colors ${pillClass}`}
                                                                                    >
                                                                                        <div className="flex items-center gap-2 flex-1">
                                                                                            <span className={`w-5 h-5 rounded font-bold font-mono text-[11px] flex items-center justify-center shrink-0 border ${badgeClass}`}>
                                                                                                {optKey}
                                                                                            </span>
                                                                                            <span className="flex-1">
                                                                                                <MathRenderer content={opt.text || ''} inline />
                                                                                            </span>
                                                                                        </div>
                                                                                        <div className="shrink-0 text-[10px] font-bold">
                                                                                            {isCorrectOption && (
                                                                                                <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded border border-emerald-500/30">
                                                                                                    ✓ Correct
                                                                                                </span>
                                                                                            )}
                                                                                            {isUserSelected && !isCorrectOption && (
                                                                                                <span className="text-rose-600 dark:text-rose-400 bg-rose-500/20 px-1.5 py-0.5 rounded border border-rose-500/30">
                                                                                                    ✗ Your Choice
                                                                                                </span>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    ) : (
                                                                        <div className="text-slate-600 dark:text-slate-300">
                                                                            Your Answer: <strong className="font-mono">{ans.selectedOption || 'None'}</strong> • Correct Answer: <strong className="font-mono text-emerald-600 dark:text-emerald-400">{ans.correctOption}</strong>
                                                                        </div>
                                                                    )}

                                                                    {/* Correct Answer Explanation Box */}
                                                                    {ans.explanation && (
                                                                        <div className="text-[11px] text-slate-700 dark:text-slate-300 bg-amber-500/10 dark:bg-amber-950/20 p-2.5 rounded-xl border border-amber-300 dark:border-amber-800/40 space-y-1">
                                                                            <div className="font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                                                                                <span>💡</span>
                                                                                <span>Explanation</span>
                                                                            </div>
                                                                            <div>
                                                                                <MathRenderer content={ans.explanation} inline />
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* MODAL 0: EDIT QUIZ & QUESTIONS */}
                {editingQuiz && (
                    <div
                        className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5"
                        onClick={() => setEditingQuiz(null)}
                    >
                        <div
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-left"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                                        <Edit3 className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                                            Edit Quiz & Questions
                                            <span className="font-mono text-xs font-bold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/40 px-2 py-0.5 rounded border border-primary-200 dark:border-primary-800">
                                                {editingQuiz.code}
                                            </span>
                                        </h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            Update quiz details, edit questions manually, or add more with AI.
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setEditingQuiz(null)}
                                    className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl transition"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Scrollable Body */}
                            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
                                {/* 1. Quiz Settings Section */}
                                <div className="bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3.5">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                                            <Settings2 className="w-4 h-4 text-primary-500" />
                                            General Quiz Settings
                                        </h4>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[11px] font-semibold text-slate-500">Status:</span>
                                            <button
                                                type="button"
                                                onClick={() => setEditFormData(p => ({ ...p, status: p.status === 'published' ? 'draft' : 'published' }))}
                                                className={`text-xs font-bold px-2.5 py-0.5 rounded-full border transition ${
                                                    editFormData.status === 'published'
                                                        ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                                                        : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                                                }`}
                                            >
                                                {editFormData.status === 'published' ? '● Published' : '○ Draft'}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                Quiz Title <span className="text-rose-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={editFormData.title}
                                                onChange={(e) => setEditFormData(p => ({ ...p, title: e.target.value }))}
                                                placeholder="Quiz Title"
                                                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-primary-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                Topic / Keywords
                                            </label>
                                            <input
                                                type="text"
                                                value={editFormData.keywords}
                                                onChange={(e) => setEditFormData(p => ({ ...p, keywords: e.target.value }))}
                                                placeholder="e.g. Organic Chemistry, Ketones"
                                                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-primary-500"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-3">
                                        <div>
                                            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                Difficulty
                                            </label>
                                            <select
                                                value={editFormData.difficulty}
                                                onChange={(e) => setEditFormData(p => ({ ...p, difficulty: e.target.value }))}
                                                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-primary-500"
                                            >
                                                <option value="easy">Easy</option>
                                                <option value="medium">Medium</option>
                                                <option value="hard">Hard</option>
                                                <option value="mixed">Mixed</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                Time Limit (Mins)
                                            </label>
                                            <input
                                                type="number"
                                                min="1"
                                                max="180"
                                                value={editFormData.timeLimitMinutes}
                                                onChange={(e) => setEditFormData(p => ({ ...p, timeLimitMinutes: e.target.value }))}
                                                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-primary-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                Max Attempts
                                            </label>
                                            <input
                                                type="number"
                                                min="1"
                                                max="50"
                                                value={editFormData.maxAttempts}
                                                onChange={(e) => setEditFormData(p => ({ ...p, maxAttempts: e.target.value }))}
                                                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-primary-500"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* 2. Questions Header & Action Bar */}
                                <div className="space-y-3">
                                    <div className="flex flex-wrap items-center justify-between gap-2.5">
                                        <div className="flex items-center gap-2">
                                            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                                Questions ({editFormData.questions.length})
                                            </h4>
                                            <div className="flex items-center gap-1 text-[11px]">
                                                <button
                                                    type="button"
                                                    onClick={handleExpandAllQuestions}
                                                    className="text-primary-600 dark:text-primary-400 hover:underline font-semibold"
                                                >
                                                    Expand All
                                                </button>
                                                <span className="text-slate-400">•</span>
                                                <button
                                                    type="button"
                                                    onClick={handleCollapseAllQuestions}
                                                    className="text-slate-500 hover:underline font-semibold"
                                                >
                                                    Collapse All
                                                </button>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={handleAddQuestionManual}
                                                className="py-1.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 shadow-xs"
                                            >
                                                <Plus className="w-3.5 h-3.5" />
                                                Add Manually
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setShowAiAddPanel(!showAiAddPanel)}
                                                className={`py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs ${
                                                    showAiAddPanel
                                                        ? 'bg-indigo-600 text-white'
                                                        : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60'
                                                }`}
                                            >
                                                <Sparkles className="w-3.5 h-3.5" />
                                                Add with AI
                                            </button>
                                        </div>
                                    </div>

                                    {/* AI Add More Questions Sub-panel */}
                                    {showAiAddPanel && (
                                        <div className="bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-indigo-500/5 dark:from-indigo-950/40 dark:via-purple-950/30 dark:to-slate-900 border border-indigo-200 dark:border-indigo-800/80 rounded-2xl p-4 space-y-3 animate-fadeIn">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                                    <h5 className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                                                        Generate & Append More Questions with AI
                                                    </h5>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowAiAddPanel(false)}
                                                    className="text-slate-400 hover:text-slate-600 text-xs"
                                                >
                                                    ✕
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                                <div className="sm:col-span-1">
                                                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                                        Topic / Specific Focus
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={aiMoreKeywords}
                                                        onChange={(e) => setAiMoreKeywords(e.target.value)}
                                                        placeholder="e.g. Oxidation reactions, Mechanism"
                                                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                                        Number of Questions
                                                    </label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max="10"
                                                        value={aiMoreCount}
                                                        onChange={(e) => setAiMoreCount(e.target.value)}
                                                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                                        Difficulty
                                                    </label>
                                                    <select
                                                        value={aiMoreDifficulty}
                                                        onChange={(e) => setAiMoreDifficulty(e.target.value)}
                                                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                                                    >
                                                        <option value="easy">Easy</option>
                                                        <option value="medium">Medium</option>
                                                        <option value="hard">Hard</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={handleAddMoreWithAI}
                                                disabled={isGeneratingMoreAI}
                                                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm"
                                            >
                                                <Sparkles className={`w-3.5 h-3.5 ${isGeneratingMoreAI ? 'animate-spin' : ''}`} />
                                                {isGeneratingMoreAI ? 'Generating New Questions...' : `Generate & Add ${aiMoreCount} Questions`}
                                            </button>
                                        </div>
                                    )}

                                    {/* Questions Cards List */}
                                    <div className="space-y-3.5">
                                        {editFormData.questions.map((q, qIdx) => {
                                            const isExpanded = expandedQuestionIndices.has(qIdx);
                                            const isImproving = aiImprovingQuestionIdx === qIdx;

                                            return (
                                                <div
                                                    key={`q-${qIdx}`}
                                                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs transition hover:border-slate-300 dark:hover:border-slate-700"
                                                >
                                                    {/* Question Card Header */}
                                                    <div 
                                                        className="p-3.5 flex items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-800/40 cursor-pointer select-none"
                                                        onClick={() => toggleQuestionExpanded(qIdx)}
                                                    >
                                                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                                            <span className="w-7 h-7 rounded-lg bg-primary-600 text-white text-xs font-extrabold flex items-center justify-center shrink-0">
                                                                {qIdx + 1}
                                                            </span>
                                                            <div className="truncate text-xs font-bold text-slate-800 dark:text-slate-200 flex-1">
                                                                {q.question ? (
                                                                    <span className="truncate">{q.question}</span>
                                                                ) : (
                                                                    <span className="text-amber-500 italic">Empty Question Prompt</span>
                                                                )}
                                                            </div>
                                                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 shrink-0">
                                                                Ans: {q.correctOption}
                                                            </span>
                                                        </div>

                                                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleMoveQuestion(qIdx, qIdx - 1)}
                                                                disabled={qIdx === 0}
                                                                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 rounded text-slate-500 transition"
                                                                title="Move Up"
                                                            >
                                                                <ArrowUp className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleMoveQuestion(qIdx, qIdx + 1)}
                                                                disabled={qIdx === editFormData.questions.length - 1}
                                                                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 rounded text-slate-500 transition"
                                                                title="Move Down"
                                                            >
                                                                <ArrowDown className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => toggleQuestionExpanded(qIdx)}
                                                                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500 transition"
                                                                title={isExpanded ? 'Collapse' : 'Expand'}
                                                            >
                                                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDeleteQuestion(qIdx)}
                                                                className="p-1 hover:bg-rose-50 hover:text-rose-600 rounded text-slate-400 transition"
                                                                title="Delete Question"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Question Card Expanded Body */}
                                                    {isExpanded && (
                                                        <div className="p-4 space-y-4 border-t border-slate-100 dark:border-slate-800">
                                                            {/* Question Prompt */}
                                                            <div className="space-y-1.5">
                                                                <div className="flex items-center justify-between">
                                                                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                                                                        Question Prompt <span className="text-rose-500">*</span>
                                                                    </label>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleImproveQuestionWithAI(qIdx)}
                                                                        disabled={isImproving}
                                                                        className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center gap-1 disabled:opacity-50"
                                                                    >
                                                                        <Sparkles className={`w-3 h-3 ${isImproving ? 'animate-spin' : ''}`} />
                                                                        {isImproving ? 'Polishing with AI...' : 'Rephrase with AI'}
                                                                    </button>
                                                                </div>
                                                                <textarea
                                                                    rows={2}
                                                                    value={q.question}
                                                                    onChange={(e) => handleUpdateQuestionField(qIdx, 'question', e.target.value)}
                                                                    placeholder="Enter question text. LaTeX ($E = mc^2$) and Chemistry ($\ce{H2O}$) formulas supported."
                                                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-primary-500 font-sans leading-relaxed"
                                                                />
                                                                {/* Live Math Preview */}
                                                                {q.question && (
                                                                    <div className="p-2 bg-slate-100/60 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-700/60 text-xs">
                                                                        <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Preview:</span>
                                                                        <MathRenderer content={q.question} />
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Options Grid (A, B, C, D) */}
                                                            <div className="space-y-2">
                                                                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                                                                    Options & Correct Answer Selection:
                                                                </label>
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                                                    {q.options.map((opt) => {
                                                                        const isCorrect = q.correctOption === opt.key;
                                                                        return (
                                                                            <div
                                                                                key={opt.key}
                                                                                className={`p-2.5 rounded-xl border transition ${
                                                                                    isCorrect
                                                                                        ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-400 dark:border-emerald-600/60'
                                                                                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-700'
                                                                                }`}
                                                                            >
                                                                                <div className="flex items-center justify-between mb-1.5">
                                                                                    <span className="font-mono font-extrabold text-xs text-slate-700 dark:text-slate-300">
                                                                                        Choice {opt.key}
                                                                                    </span>
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => handleSetCorrectOption(qIdx, opt.key)}
                                                                                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition flex items-center gap-1 ${
                                                                                            isCorrect
                                                                                                ? 'bg-emerald-600 text-white shadow-xs'
                                                                                                : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-300'
                                                                                        }`}
                                                                                    >
                                                                                        {isCorrect ? '✓ Correct Answer' : 'Mark Correct'}
                                                                                    </button>
                                                                                </div>
                                                                                <input
                                                                                    type="text"
                                                                                    value={opt.text}
                                                                                    onChange={(e) => handleUpdateOptionText(qIdx, opt.key, e.target.value)}
                                                                                    placeholder={`Text for Option ${opt.key}`}
                                                                                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-primary-500"
                                                                                />
                                                                                {opt.text && (
                                                                                    <div className="mt-1 text-xs text-slate-600 dark:text-slate-300 px-1">
                                                                                        <MathRenderer content={opt.text} inline />
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>

                                                            {/* Explanation */}
                                                            <div className="space-y-1">
                                                                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                                                                    Explanation (Why the correct option is right):
                                                                </label>
                                                                <textarea
                                                                    rows={2}
                                                                    value={q.explanation}
                                                                    onChange={(e) => handleUpdateQuestionField(qIdx, 'explanation', e.target.value)}
                                                                    placeholder="Detailed explanation of the solution..."
                                                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-primary-500"
                                                                />
                                                                {q.explanation && (
                                                                    <div className="p-2 bg-amber-50/50 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-800/40 text-xs">
                                                                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase block mb-0.5">Explanation Preview:</span>
                                                                        <MathRenderer content={q.explanation} inline />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-between gap-3">
                                <div className="text-xs text-slate-500">
                                    <span className="font-bold text-slate-800 dark:text-slate-200">{editFormData.questions.length} Questions</span>
                                    <span className="mx-1.5">•</span>
                                    <span>{editFormData.timeLimitMinutes} Mins</span>
                                    <span className="mx-1.5">•</span>
                                    <span className="capitalize">{editFormData.difficulty}</span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setEditingQuiz(null)}
                                        className="py-2 px-4 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold border border-slate-300 dark:border-slate-700 transition"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSaveEditedQuiz}
                                        disabled={isSavingEdit}
                                        className="py-2 px-5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                                    >
                                        {isSavingEdit ? (
                                            <>
                                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                                Saving Changes...
                                            </>
                                        ) : (
                                            'Save Quiz Changes'
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* MODAL 1: CREATE AI QUIZ (FOR STAFF) */}
                {showCreateModal && (
                    <div
                        className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={() => setShowCreateModal(false)}
                    >
                        <div
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full p-6 space-y-4 shadow-2xl text-left"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                                <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-primary-600" />
                                    Generate AI Quiz
                                </h3>
                                <button
                                    onClick={() => setShowCreateModal(false)}
                                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 rounded-lg"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        Keywords / Topics <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={keywords}
                                        onChange={(e) => setKeywords(e.target.value)}
                                        placeholder="e.g. Data Structures, Linked Lists, Binary Trees"
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-primary-500"
                                    />
                                </div>

                                <div className="grid grid-cols-4 gap-2.5">
                                    <div>
                                        <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                                            Difficulty
                                        </label>
                                        <select
                                            value={difficulty}
                                            onChange={(e) => setDifficulty(e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-2 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-primary-500"
                                        >
                                            <option value="easy">Easy</option>
                                            <option value="medium">Medium</option>
                                            <option value="hard">Hard</option>
                                            <option value="mixed">Mixed</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                                            Questions
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="30"
                                            value={questionCount}
                                            onChange={(e) => setQuestionCount(e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-2 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-primary-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                                            Time (Mins)
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="120"
                                            value={timeLimitMinutes}
                                            onChange={(e) => setTimeLimitMinutes(e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-2 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-primary-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                                            Max Attempts
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="20"
                                            value={maxAttemptsInput}
                                            onChange={(e) => setMaxAttemptsInput(e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-2 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-primary-500"
                                        />
                                    </div>
                                </div>

                                <button
                                    onClick={handleGenerateAI}
                                    disabled={isGenerating || !keywords.trim()}
                                    className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm"
                                >
                                    <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                                    {isGenerating ? 'Generating Questions...' : 'Generate with AI'}
                                </button>
                            </div>

                            {/* Preview and Save */}
                            {generatedQuestions.length > 0 && (
                                <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                                    <input
                                        type="text"
                                        value={quizTitle}
                                        onChange={(e) => setQuizTitle(e.target.value)}
                                        placeholder="Quiz Title"
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-primary-500"
                                    />
                                    <div className="flex items-center justify-between text-xs text-slate-500">
                                        <span>{generatedQuestions.length} Questions Ready • Max Attempts: {maxAttemptsInput}</span>
                                        <button
                                            onClick={() => setQuizStatus(quizStatus === 'published' ? 'draft' : 'published')}
                                            className="text-xs font-bold text-primary-600 hover:underline"
                                        >
                                            Status: {quizStatus}
                                        </button>
                                    </div>

                                    <button
                                        onClick={handleSaveGeneratedQuiz}
                                        disabled={isSaving}
                                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-sm"
                                    >
                                        {isSaving ? 'Saving...' : 'Save & Publish Quiz'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* MODAL 2: ASSIGN QUIZ (TO CLASSES, GROUPS, AND/OR STUDENTS) */}
                {assignQuizTargets.length > 0 && (
                    <div
                        className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
                        onClick={() => setAssignQuizTargets([])}
                    >
                        <div
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-5 sm:p-6 space-y-4 shadow-2xl text-left my-auto max-h-[92vh] flex flex-col"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Modal Header & Quiz Selection */}
                            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3 flex-shrink-0">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Users className="w-5 h-5 text-primary-600" />
                                        <h3 className="font-bold text-base text-slate-900 dark:text-white">
                                            Assign Quiz {assignQuizTargets.length > 1 ? `(${assignQuizTargets.length} Quizzes Selected)` : ''}
                                        </h3>
                                    </div>
                                    <p className="text-xs text-slate-500">
                                        Assign selected quiz(zes) to multiple classes, groups, or individual students.
                                    </p>
                                </div>
                                <button
                                    onClick={() => setAssignQuizTargets([])}
                                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 rounded-lg transition"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Quizzes to Assign (Pills + Search/Add) */}
                            <div className="bg-slate-50 dark:bg-slate-950/70 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 flex-shrink-0">
                                <div className="flex items-center justify-between">
                                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                                        Quizzes to Assign ({assignQuizTargets.length})
                                    </label>
                                    {quizzes.length > assignQuizTargets.length && (
                                        <span className="text-[11px] text-slate-400">
                                            Add more quizzes below
                                        </span>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto custom-scrollbar">
                                    {assignQuizTargets.map(q => (
                                        <span
                                            key={q.id}
                                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white dark:bg-slate-900 border border-primary-200 dark:border-primary-800 text-xs font-semibold text-primary-700 dark:text-primary-300 shadow-xs"
                                        >
                                            <span className="font-mono text-[10px] text-primary-500">{q.code}</span>
                                            <span className="truncate max-w-[180px]">{q.title}</span>
                                            {assignQuizTargets.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveQuizFromAssignTargets(q.id)}
                                                    className="p-0.5 hover:bg-rose-100 dark:hover:bg-rose-950/60 text-slate-400 hover:text-rose-600 rounded"
                                                    title="Remove from batch"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            )}
                                        </span>
                                    ))}
                                </div>

                                {/* Add more quizzes picker if multiple available */}
                                {quizzes.filter(q => !assignQuizTargets.some(t => t.id === q.id)).length > 0 && (
                                    <div className="flex items-center gap-2 pt-1">
                                        <select
                                            value=""
                                            onChange={(e) => {
                                                const found = quizzes.find(q => q.id === e.target.value);
                                                if (found) handleAddQuizToAssignTargets(found);
                                            }}
                                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-primary-500"
                                        >
                                            <option value="">+ Add another quiz to this assignment...</option>
                                            {quizzes
                                                .filter(q => !assignQuizTargets.some(t => t.id === q.id))
                                                .map(q => (
                                                    <option key={q.id} value={q.id}>
                                                        {q.code} - {q.title} ({q.totalQuestions}Q)
                                                    </option>
                                                ))}
                                        </select>
                                    </div>
                                )}
                            </div>

                            {/* Scope Selector Tabs */}
                            <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200 dark:border-slate-700 flex-shrink-0">
                                {[
                                    { id: 'class', label: 'Entire Classes', count: selectedAssignClasses.length },
                                    { id: 'group', label: 'Student Groups', count: selectedAssignGroups.length },
                                    { id: 'student', label: 'Specific Students', count: selectedAssignStudents.length }
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setAssignTargetType(tab.id)}
                                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                                            assignTargetType === tab.id
                                                ? 'bg-white dark:bg-slate-900 text-primary-600 dark:text-primary-400 shadow-sm'
                                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                        }`}
                                    >
                                        <span>{tab.label}</span>
                                        {tab.count > 0 && (
                                            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-300">
                                                {tab.count}
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>

                            {/* TAB 1: ENTIRE CLASSES */}
                            {assignTargetType === 'class' && (() => {
                                const classSearchQuery = assignClassSearch.toLowerCase().trim();
                                const visibleClasses = classList.filter(c => {
                                    const isChecked = selectedAssignClasses.includes(c.id);
                                    if (isChecked) return true; // checked items always visible on top
                                    if (!classSearchQuery) return true;
                                    const name = (c.name || '').toLowerCase();
                                    const sec = (c.section || '').toLowerCase();
                                    const grade = String(c.gradeLevel || '').toLowerCase();
                                    return name.includes(classSearchQuery) || sec.includes(classSearchQuery) || grade.includes(classSearchQuery);
                                });

                                const sortedClasses = [...visibleClasses].sort((a, b) => {
                                    const aChecked = selectedAssignClasses.includes(a.id);
                                    const bChecked = selectedAssignClasses.includes(b.id);
                                    if (aChecked && !bChecked) return -1;
                                    if (!aChecked && bChecked) return 1;
                                    return (classOriginalIndexMap.get(a.id) ?? 0) - (classOriginalIndexMap.get(b.id) ?? 0);
                                });

                                return (
                                    <div className="space-y-2.5 flex-1 min-h-0 flex flex-col">
                                        {/* Search & Actions */}
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <div className="relative flex-1">
                                                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                <input
                                                    type="text"
                                                    value={assignClassSearch}
                                                    onChange={(e) => setAssignClassSearch(e.target.value)}
                                                    placeholder="Search classes by name, section, or grade..."
                                                    className="w-full pl-8.5 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-primary-500"
                                                />
                                            </div>
                                            {sortedClasses.length > 0 && (
                                                <div className="flex items-center gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSelectAllFilteredClasses(sortedClasses)}
                                                        className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-[11px] font-bold transition"
                                                    >
                                                        Select All
                                                    </button>
                                                    {selectedAssignClasses.length > 0 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setSelectedAssignClasses([])}
                                                            className="px-2.5 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 rounded-xl text-[11px] font-medium transition"
                                                        >
                                                            Clear
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Class list */}
                                        <div className="flex-1 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-2xl p-2.5 max-h-64 custom-scrollbar bg-slate-50/50 dark:bg-slate-950/50">
                                            {sortedClasses.length === 0 ? (
                                                <p className="text-xs text-slate-400 py-6 text-center">
                                                    {assignClassSearch ? 'No classes match your search query.' : 'No classes found.'}
                                                </p>
                                            ) : (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                    {sortedClasses.map((c, idx) => {
                                                        const isChecked = selectedAssignClasses.includes(c.id);
                                                        const prevItem = idx > 0 ? sortedClasses[idx - 1] : null;
                                                        const isFirstUnchecked = !isChecked && prevItem && selectedAssignClasses.includes(prevItem.id);

                                                        return (
                                                            <React.Fragment key={c.id}>
                                                                {isFirstUnchecked && (
                                                                    <div className="col-span-full py-1 px-1 flex items-center gap-2">
                                                                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                                                            Available in Pool
                                                                        </span>
                                                                        <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1" />
                                                                    </div>
                                                                )}
                                                                <div
                                                                    onClick={() => handleToggleClassSelection(c.id)}
                                                                    className={`flex items-center justify-between p-2 rounded-xl cursor-pointer text-xs transition border ${
                                                                        isChecked
                                                                            ? 'bg-primary-50/80 dark:bg-primary-950/40 border-primary-300 dark:border-primary-700 shadow-xs'
                                                                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                                                                    }`}
                                                                >
                                                                    <div className="flex items-center gap-2 min-w-0">
                                                                        {isChecked ? (
                                                                            <CheckSquare className="w-4 h-4 text-primary-600 flex-shrink-0" />
                                                                        ) : (
                                                                            <Square className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                                                        )}
                                                                        <div className="truncate">
                                                                            <span className="font-bold text-slate-900 dark:text-white">
                                                                                {c.name}
                                                                            </span>
                                                                            {c.section && (
                                                                                <span className="ml-1 text-slate-500 dark:text-slate-400 font-medium">
                                                                                    ({c.section})
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    {c.gradeLevel && (
                                                                        <span className="px-1.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold text-slate-600 dark:text-slate-400 flex-shrink-0 ml-1">
                                                                            Gr {c.gradeLevel}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </React.Fragment>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* TAB 2: STUDENT GROUPS */}
                            {assignTargetType === 'group' && (() => {
                                const groupSearchQuery = assignGroupSearch.toLowerCase().trim();
                                const visibleGroups = allClassGroups.filter(g => {
                                    const isChecked = selectedAssignGroups.includes(g.id);
                                    if (isChecked) return true; // checked groups always visible on top
                                    if (selectedAssignClasses.length > 0 && !selectedAssignClasses.includes(g.classId)) {
                                        return false;
                                    }
                                    if (!groupSearchQuery) return true;
                                    const name = (g.name || '').toLowerCase();
                                    const cName = (g.className || '').toLowerCase();
                                    return name.includes(groupSearchQuery) || cName.includes(groupSearchQuery);
                                });

                                const sortedGroups = [...visibleGroups].sort((a, b) => {
                                    const aChecked = selectedAssignGroups.includes(a.id);
                                    const bChecked = selectedAssignGroups.includes(b.id);
                                    if (aChecked && !bChecked) return -1;
                                    if (!aChecked && bChecked) return 1;
                                    return (groupOriginalIndexMap.get(a.id) ?? 0) - (groupOriginalIndexMap.get(b.id) ?? 0);
                                });

                                return (
                                    <div className="space-y-2.5 flex-1 min-h-0 flex flex-col">
                                        {/* Search & Actions */}
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <div className="relative flex-1">
                                                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                <input
                                                    type="text"
                                                    value={assignGroupSearch}
                                                    onChange={(e) => setAssignGroupSearch(e.target.value)}
                                                    placeholder="Search groups by group name or class name..."
                                                    className="w-full pl-8.5 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-primary-500"
                                                />
                                            </div>
                                            {sortedGroups.length > 0 && (
                                                <div className="flex items-center gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSelectAllFilteredGroups(sortedGroups)}
                                                        className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-[11px] font-bold transition"
                                                    >
                                                        Select All
                                                    </button>
                                                    {selectedAssignGroups.length > 0 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setSelectedAssignGroups([])}
                                                            className="px-2.5 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 rounded-xl text-[11px] font-medium transition"
                                                        >
                                                            Clear
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {selectedAssignClasses.length > 0 && (
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400 flex-shrink-0">
                                                Filtering groups from {selectedAssignClasses.length} selected class(es).
                                            </p>
                                        )}

                                        {/* Groups List */}
                                        <div className="flex-1 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-2xl p-2.5 max-h-64 custom-scrollbar bg-slate-50/50 dark:bg-slate-950/50">
                                            {sortedGroups.length === 0 ? (
                                                <p className="text-xs text-slate-400 py-6 text-center">
                                                    {assignGroupSearch ? 'No groups match your search query.' : 'No groups available.'}
                                                </p>
                                            ) : (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                    {sortedGroups.map((g, idx) => {
                                                        const isChecked = selectedAssignGroups.includes(g.id);
                                                        const prevItem = idx > 0 ? sortedGroups[idx - 1] : null;
                                                        const isFirstUnchecked = !isChecked && prevItem && selectedAssignGroups.includes(prevItem.id);

                                                        return (
                                                            <React.Fragment key={g.id}>
                                                                {isFirstUnchecked && (
                                                                    <div className="col-span-full py-1 px-1 flex items-center gap-2">
                                                                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                                                            Available in Pool
                                                                        </span>
                                                                        <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1" />
                                                                    </div>
                                                                )}
                                                                <div
                                                                    onClick={() => handleToggleGroupSelection(g.id)}
                                                                    className={`flex items-center justify-between p-2 rounded-xl cursor-pointer text-xs transition border ${
                                                                        isChecked
                                                                            ? 'bg-primary-50/80 dark:bg-primary-950/40 border-primary-300 dark:border-primary-700 shadow-xs'
                                                                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                                                                    }`}
                                                                >
                                                                    <div className="flex items-center gap-2 min-w-0">
                                                                        {isChecked ? (
                                                                            <CheckSquare className="w-4 h-4 text-primary-600 flex-shrink-0" />
                                                                        ) : (
                                                                            <Square className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                                                        )}
                                                                        <span className="font-bold text-slate-900 dark:text-white truncate">
                                                                            {g.name}
                                                                        </span>
                                                                    </div>
                                                                    {g.className && (
                                                                        <span className="px-1.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold text-slate-600 dark:text-slate-400 flex-shrink-0 ml-1">
                                                                            {g.className}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </React.Fragment>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* TAB 3: SPECIFIC STUDENTS (FILTER BY CLASS, SEARCH & PERSIST) */}
                            {assignTargetType === 'student' && (() => {
                                const studentSearchQuery = assignStudentSearch.toLowerCase().trim();
                                const visibleStudents = allClassStudents.filter(s => {
                                    const isChecked = selectedAssignStudents.includes(s.id);
                                    if (isChecked) return true; // checked students always visible on top
                                    if (studentClassFilter !== 'all' && s.classId !== studentClassFilter) {
                                        return false;
                                    }
                                    if (!studentSearchQuery) return true;
                                    const fullName = `${s.firstName || ''} ${s.lastName || ''}`.toLowerCase();
                                    const email = (s.email || '').toLowerCase();
                                    const sId = (s.studentId || '').toLowerCase();
                                    return fullName.includes(studentSearchQuery) || email.includes(studentSearchQuery) || sId.includes(studentSearchQuery);
                                });

                                const sortedStudents = [...visibleStudents].sort((a, b) => {
                                    const aChecked = selectedAssignStudents.includes(a.id);
                                    const bChecked = selectedAssignStudents.includes(b.id);
                                    if (aChecked && !bChecked) return -1;
                                    if (!aChecked && bChecked) return 1;
                                    return (studentOriginalIndexMap.get(a.id) ?? 0) - (studentOriginalIndexMap.get(b.id) ?? 0);
                                });

                                return (
                                    <div className="space-y-2.5 flex-1 min-h-0 flex flex-col">
                                        {/* Class Filter Bar + Student Search */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-shrink-0">
                                            {/* Filter Students by Class (Preserves Selections!) */}
                                            <div>
                                                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                                                    Filter by Class
                                                </label>
                                                <select
                                                    value={studentClassFilter}
                                                    onChange={(e) => setStudentClassFilter(e.target.value)}
                                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-primary-500"
                                                >
                                                    <option value="all">All Enrolled Classes ({allClassStudents.length} students)</option>
                                                    {classList.map(c => (
                                                        <option key={c.id} value={c.id}>
                                                            {c.name} {c.section ? `(${c.section})` : ''} - Grade {c.gradeLevel}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* Search inside students */}
                                            <div>
                                                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                                                    Search Student
                                                </label>
                                                <div className="relative">
                                                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                    <input
                                                        type="text"
                                                        value={assignStudentSearch}
                                                        onChange={(e) => setAssignStudentSearch(e.target.value)}
                                                        placeholder="Name, email, roll ID..."
                                                        className="w-full pl-8.5 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-primary-500"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Persistent Selection Summary & Quick Actions */}
                                        <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-xs flex-shrink-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-slate-800 dark:text-slate-200">
                                                    {selectedAssignStudents.length} selected across classes
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => handleSelectAllFilteredStudents(sortedStudents)}
                                                    className="px-2 py-1 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-bold text-slate-700 dark:text-slate-300 transition"
                                                >
                                                    Select All
                                                </button>
                                                {selectedAssignStudents.length > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={handleClearAllSelectedStudents}
                                                        className="px-2 py-1 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 rounded-lg text-[11px] font-medium transition"
                                                    >
                                                        Clear All
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Students list */}
                                        <div className="flex-1 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-2xl p-2.5 max-h-64 custom-scrollbar bg-slate-50/50 dark:bg-slate-950/50">
                                            {sortedStudents.length === 0 ? (
                                                <p className="text-xs text-slate-400 py-6 text-center">
                                                    {assignStudentSearch ? 'No students match your search filter.' : 'No students found in this class.'}
                                                </p>
                                            ) : (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                    {sortedStudents.map((s, idx) => {
                                                        const isChecked = selectedAssignStudents.includes(s.id);
                                                        const prevItem = idx > 0 ? sortedStudents[idx - 1] : null;
                                                        const isFirstUnchecked = !isChecked && prevItem && selectedAssignStudents.includes(prevItem.id);

                                                        return (
                                                            <React.Fragment key={s.id}>
                                                                {isFirstUnchecked && (
                                                                    <div className="col-span-full py-1 px-1 flex items-center gap-2">
                                                                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                                                            Available in Pool
                                                                        </span>
                                                                        <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1" />
                                                                    </div>
                                                                )}
                                                                <div
                                                                    onClick={() => handleToggleStudentSelection(s.id)}
                                                                    className={`flex items-center justify-between p-2 rounded-xl cursor-pointer text-xs transition border ${
                                                                        isChecked
                                                                            ? 'bg-primary-50/80 dark:bg-primary-950/40 border-primary-300 dark:border-primary-700 shadow-xs'
                                                                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                                                                    }`}
                                                                >
                                                                    <div className="flex items-center gap-2 min-w-0">
                                                                        {isChecked ? (
                                                                            <CheckSquare className="w-4 h-4 text-primary-600 flex-shrink-0" />
                                                                        ) : (
                                                                            <Square className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                                                        )}
                                                                        <div className="min-w-0">
                                                                            <div className="font-bold text-slate-900 dark:text-white truncate">
                                                                                {s.firstName} {s.lastName}
                                                                            </div>
                                                                            <div className="text-[10px] text-slate-400 truncate">
                                                                                {s.studentId ? `ID: ${s.studentId}` : s.email}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    {s.className && (
                                                                        <span className="px-1.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold text-slate-600 dark:text-slate-400 flex-shrink-0 ml-1">
                                                                            {s.className}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </React.Fragment>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Confirm Assignment Button */}
                            <div className="pt-2 flex-shrink-0 space-y-2">
                                <button
                                    onClick={handleSaveAssignment}
                                    disabled={
                                        isAssigning ||
                                        (selectedAssignClasses.length === 0 &&
                                            selectedAssignGroups.length === 0 &&
                                            selectedAssignStudents.length === 0)
                                    }
                                    className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm"
                                >
                                    <Send className="w-4 h-4" />
                                    {isAssigning
                                        ? 'Assigning Targets...'
                                        : `Confirm Assignment (${[
                                              selectedAssignClasses.length > 0 ? `${selectedAssignClasses.length} Classes` : '',
                                              selectedAssignGroups.length > 0 ? `${selectedAssignGroups.length} Groups` : '',
                                              selectedAssignStudents.length > 0 ? `${selectedAssignStudents.length} Students` : ''
                                          ]
                                              .filter(Boolean)
                                              .join(' • ') || 'Select Targets'})`}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* MODAL 3: VIEW SUBMISSIONS & RESPONSES (FOR STAFF) */}
                {viewSubmissionsQuiz && (
                    <div
                        className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={() => setViewSubmissionsQuiz(null)}
                    >
                        <div
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl text-left"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                                <div>
                                    <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                                        <BarChart3 className="w-5 h-5 text-primary-600" />
                                        Quiz Submissions & Responses
                                    </h3>
                                    <p className="text-xs text-slate-500 truncate max-w-md">{viewSubmissionsQuiz.title}</p>
                                </div>
                                <button
                                    onClick={() => setViewSubmissionsQuiz(null)}
                                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 rounded-lg"
                                >
                                    ✕
                                </button>
                            </div>

                            {isLoadingSubmissions ? (
                                <div className="py-12 text-center text-slate-500 text-xs animate-pulse">
                                    Loading student responses...
                                </div>
                            ) : !submissionsData || submissionsData.submissions?.length === 0 ? (
                                <div className="py-12 text-center text-slate-500 text-xs">
                                    No students have submitted this quiz yet.
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* Summary Banner */}
                                    <div className="grid grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
                                        <div>
                                            <div className="text-[10px] text-slate-500 font-bold uppercase">Participants</div>
                                            <div className="text-base font-extrabold text-slate-900 dark:text-white">
                                                {submissionsData.summary?.totalParticipants}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-[10px] text-slate-500 font-bold uppercase">Average Score</div>
                                            <div className="text-base font-extrabold text-primary-600">
                                                {submissionsData.summary?.avgScore} / {submissionsData.summary?.maxPossibleScore}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-[10px] text-slate-500 font-bold uppercase">Highest Score</div>
                                            <div className="text-base font-extrabold text-emerald-600">
                                                {submissionsData.summary?.highestScore}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Submissions List with Accordion Responses */}
                                    <div className="max-h-96 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
                                        {submissionsData.submissions.map((sub) => {
                                            const isExpanded = expandedSubmissionIds.has(sub.id);
                                            const subAnswers = Array.isArray(sub.answers) ? sub.answers : [];

                                            return (
                                                <div
                                                    key={sub.id}
                                                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2.5 transition"
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <div className="font-bold text-xs text-slate-900 dark:text-white">
                                                                {sub.userName}
                                                            </div>
                                                            <div className="text-[10px] text-slate-400">
                                                                {new Date(sub.submittedAt).toLocaleDateString()} • {Math.floor(sub.timeTakenSeconds / 60)}m {sub.timeTakenSeconds % 60}s
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-3">
                                                            <div className="text-right">
                                                                <span className="font-extrabold text-xs text-primary-600">
                                                                    {sub.score} / {sub.totalQuestions}
                                                                </span>
                                                                <span className="block text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                                                    {sub.percentage}%
                                                                </span>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => setReviewModalSubmission({
                                                                    ...sub,
                                                                    quizTitle: activeSubmissionsQuiz?.title,
                                                                    quizCode: activeSubmissionsQuiz?.code
                                                                })}
                                                                className="py-1 px-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm transition"
                                                            >
                                                                <LayoutGrid className="w-3 h-3" /> Palette
                                                            </button>
                                                            <button
                                                                onClick={() => toggleSubmissionAccordion(sub.id)}
                                                                className="py-1 px-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1 hover:bg-slate-100"
                                                            >
                                                                {isExpanded ? 'Hide' : 'Review'}
                                                                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* ACCORDION RESPONSES FOR ADMIN VIEW */}
                                                    {isExpanded && (
                                                        <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
                                                            <div className="max-h-64 overflow-y-auto space-y-2 custom-scrollbar">
                                                                {subAnswers.length === 0 ? (
                                                                    <p className="text-xs text-slate-400">No question breakdown recorded.</p>
                                                                ) : (
                                                                    subAnswers.map((ans, aIdx) => (
                                                                        <div
                                                                            key={aIdx}
                                                                            className={`p-2.5 rounded-xl border text-[11px] space-y-1 ${
                                                                                ans.isCorrect
                                                                                    ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 text-slate-800 dark:text-emerald-200'
                                                                                    : 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800 text-slate-800 dark:text-rose-200'
                                                                            }`}
                                                                        >
                                                                            {/* Question Statement */}
                                                                            <div className="flex items-start justify-between gap-2 font-bold">
                                                                                <div className="flex-1">
                                                                                    <span className="text-slate-400 mr-1.5">Q{aIdx + 1}:</span>
                                                                                    <MathRenderer content={ans.questionText} inline />
                                                                                </div>
                                                                                <span className={ans.isCorrect ? 'text-emerald-600 font-bold shrink-0' : 'text-rose-600 font-bold shrink-0'}>
                                                                                    {ans.isCorrect ? '✓ Correct' : '✗ Incorrect'}
                                                                                </span>
                                                                            </div>

                                                                            {/* All 4 Choices with Green / Red Response Highlighting */}
                                                                            {ans.options && ans.options.length > 0 ? (
                                                                                <div className="space-y-1 pt-0.5">
                                                                                    {ans.options.map((opt) => {
                                                                                        const optKey = String(opt.key || '').toUpperCase();
                                                                                        const isUserSelected = optKey === String(ans.selectedOption || '').toUpperCase();
                                                                                        const isCorrectOption = optKey === String(ans.correctOption || '').toUpperCase();

                                                                                        let badgeClass = 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-300 dark:border-slate-700';
                                                                                        let pillClass = 'bg-white/80 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300';

                                                                                        if (isCorrectOption) {
                                                                                            pillClass = 'bg-emerald-500/15 border-emerald-500 text-emerald-900 dark:text-emerald-200 font-semibold ring-1 ring-emerald-500/40';
                                                                                            badgeClass = 'bg-emerald-600 text-white border-emerald-600';
                                                                                        } else if (isUserSelected && !isCorrectOption) {
                                                                                            pillClass = 'bg-rose-500/15 border-rose-500 text-rose-900 dark:text-rose-200 font-semibold ring-1 ring-rose-500/40';
                                                                                            badgeClass = 'bg-rose-600 text-white border-rose-600';
                                                                                        }

                                                                                        return (
                                                                                            <div
                                                                                                key={optKey}
                                                                                                className={`p-1.5 rounded-lg border flex items-center justify-between gap-2 text-[10px] ${pillClass}`}
                                                                                            >
                                                                                                <div className="flex items-center gap-1.5 flex-1">
                                                                                                    <span className={`w-4 h-4 rounded font-bold font-mono text-[10px] flex items-center justify-center shrink-0 border ${badgeClass}`}>
                                                                                                        {optKey}
                                                                                                    </span>
                                                                                                    <span className="flex-1">
                                                                                                        <MathRenderer content={opt.text || ''} inline />
                                                                                                    </span>
                                                                                                </div>
                                                                                                <div className="shrink-0 font-bold">
                                                                                                    {isCorrectOption && (
                                                                                                        <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-500/20 px-1 py-0.2 rounded border border-emerald-500/30">
                                                                                                            ✓ Correct
                                                                                                        </span>
                                                                                                    )}
                                                                                                    {isUserSelected && !isCorrectOption && (
                                                                                                        <span className="text-rose-600 dark:text-rose-400 bg-rose-500/20 px-1 py-0.2 rounded border border-rose-500/30">
                                                                                                            ✗ Selected
                                                                                                        </span>
                                                                                                    )}
                                                                                                </div>
                                                                                            </div>
                                                                                        );
                                                                                    })}
                                                                                </div>
                                                                            ) : (
                                                                                <div className="text-slate-600 dark:text-slate-300">
                                                                                    Selected: <strong className="font-mono">{ans.selectedOption || 'None'}</strong> • Correct: <strong className="font-mono text-emerald-600">{ans.correctOption}</strong>
                                                                                </div>
                                                                            )}

                                                                            {/* Explanation Box */}
                                                                            {ans.explanation && (
                                                                                <div className="text-[10px] text-slate-700 dark:text-slate-300 bg-amber-500/10 dark:bg-amber-950/20 p-2 rounded-lg border border-amber-300 dark:border-amber-800/40 space-y-0.5">
                                                                                    <div className="font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                                                                                        <span>💡</span>
                                                                                        <span>Explanation</span>
                                                                                    </div>
                                                                                    <div>
                                                                                        <MathRenderer content={ans.explanation} inline />
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    ))
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* MODAL 4: SHARE & QR CODE */}
                {shareQuiz && (
                    <div
                        className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={() => setShareQuiz(null)}
                    >
                        <div
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="w-12 h-12 bg-primary-50 dark:bg-primary-950/40 text-primary-600 rounded-2xl flex items-center justify-center mx-auto">
                                <QrCode className="w-6 h-6" />
                            </div>
                            <h3 className="font-bold text-slate-900 dark:text-white text-base">
                                {shareQuiz.title}
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Scan with camera or use code to join from any device.
                            </p>

                            {qrCodeDataUrl && (
                                <div className="bg-white p-3 rounded-2xl inline-block shadow border border-slate-200">
                                    <img src={qrCodeDataUrl} alt="QR Code" className="w-48 h-48 mx-auto rounded-lg" />
                                </div>
                            )}

                            <div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                    Quiz Code
                                </div>
                                <div className="text-2xl font-mono font-extrabold text-primary-600 bg-slate-50 dark:bg-slate-950 py-1.5 px-4 rounded-xl border border-slate-200 dark:border-slate-800 inline-block tracking-widest">
                                    {shareQuiz.code}
                                </div>
                            </div>

                            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 p-2 rounded-xl text-xs font-mono text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
                                <span className="truncate flex-1 text-left">{`${window.location.origin}/quiz/join/${shareQuiz.code}`}</span>
                                <button
                                    onClick={handleCopyLink}
                                    className="p-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition"
                                >
                                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                            </div>

                            <button
                                onClick={() => setShareQuiz(null)}
                                className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                )}

                {/* Question Palette Detailed Review Modal */}
                {reviewModalSubmission && (
                    <QuizReviewModal
                        isOpen={Boolean(reviewModalSubmission)}
                        onClose={() => setReviewModalSubmission(null)}
                        submission={reviewModalSubmission}
                    />
                )}

            </main>
        </div>
    );
}
