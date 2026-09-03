'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
    ArrowLeft, Plus, ChevronDown, ChevronUp, Save, EyeOff,
    BookOpen, Layers, Target, Unlock, ShieldAlert, Award,
    Lightbulb, Trash2, Edit3, Lock, Trophy, CheckCircle,
    AlertTriangle, XCircle, Sparkles, FlaskConical, Eye,
    GripVertical, Send, Users, Calendar, Globe, Settings, Clock,
    CheckSquare, FileText, Code2, RefreshCw
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import api, { trainingAPI, classesAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { formatDate } from '@/lib/dateUtils';
import AiTrainingCopilot from '@/components/AiTrainingCopilot';

// --- Pedagogy Score Engine ---
function computePedagogyScore(moduleData) {
    if (!moduleData?.units?.length) return { score: 0, checks: [], warnings: [], errors: [] };

    const checks = [];
    const warnings = [];
    const errors = [];
    let score = 0;

    const allExercises = moduleData.units.flatMap(u => u.exercises || []);
    const scaffoldLevels = allExercises.map(e => e.scaffoldLevel);
    const difficulties = allExercises.map(e => e.difficulty);
    const xpValues = allExercises.map(e => e.xpReward);
    const hasReview = allExercises.some(e => e.isReviewExercise);
    const hasProject = scaffoldLevels.includes('project');
    const hasHiddenTests = allExercises.some(e => {
        try { return JSON.parse(e.testCases || '[]').some(t => t.isHidden); } catch { return false; }
    });
    const uniqueScaffolds = [...new Set(scaffoldLevels)];
    const uniqueDifficulties = [...new Set(difficulties)];
    const uniqueXP = [...new Set(xpValues)];

    // Scaffold progression
    if (uniqueScaffolds.length >= 2) {
        checks.push('Scaffold progression present');
        score += 20;
    } else {
        warnings.push('Add varied scaffold levels (Guided → Independent)');
    }

    // Mastery gates
    const allGated = moduleData.units.every(u => u.unlockThreshold > 0);
    if (allGated) {
        checks.push('Mastery gates configured on all units');
        score += 15;
    } else {
        warnings.push('Configure mastery unlock thresholds on all units');
    }

    // Spaced repetition
    if (hasReview) {
        checks.push('Spaced repetition exercises included');
        score += 15;
    } else {
        warnings.push('Add review exercises for spaced repetition');
    }

    // Project/Capstone
    if (hasProject) {
        checks.push('Capstone project exercise exists');
        score += 15;
    } else {
        errors.push('No capstone/project exercise — add one for PBL');
    }

    // Hidden test cases (TDD awareness)
    if (hasHiddenTests) {
        checks.push('Hidden test cases for TDD awareness');
        score += 15;
    } else {
        errors.push('No hidden test cases — students won\'t learn edge-case thinking');
    }

    // XP variety
    if (uniqueXP.length >= 3) {
        checks.push('XP rewards are varied for engagement');
        score += 10;
    } else {
        warnings.push('Vary XP rewards (10→15→25→50) for engagement');
    }

    // Difficulty variety
    if (uniqueDifficulties.length >= 2) {
        checks.push('Difficulty levels are varied');
        score += 10;
    } else {
        warnings.push('Mix difficulty levels to maintain engagement');
    }

    return { score: Math.min(score, 100), checks, warnings, errors };
}

// --- Design Coach Tips ---
function getDesignTips(moduleData, activeUnit) {
    const tips = [];
    if (!moduleData?.units?.length) {
        tips.push({ icon: '🎯', text: 'Start by creating your first unit. Each unit should cover one topic or concept.' });
        return tips;
    }

    if (activeUnit) {
        const exercises = activeUnit.exercises || [];
        if (exercises.length === 0) {
            tips.push({ icon: '🎯', text: 'Start with a Guided exercise so students see the pattern before trying independently.' });
        }
        if (exercises.length > 0 && !exercises.some(e => e.isReviewExercise)) {
            tips.push({ icon: '🔄', text: 'Consider adding a Spaced Repetition exercise that revisits concepts from a previous unit.' });
        }
        const allSameDifficulty = exercises.length > 1 && new Set(exercises.map(e => e.difficulty)).size === 1;
        if (allSameDifficulty) {
            tips.push({ icon: '📈', text: 'Vary difficulty: start Beginner, end Advanced. This maintains engagement through progressive challenge.' });
        }
        const allFlatXP = exercises.length > 1 && new Set(exercises.map(e => e.xpReward)).size === 1;
        if (allFlatXP) {
            tips.push({ icon: '⚡', text: 'Increase XP for harder exercises. 10→15→25→50 is a good progression curve.' });
        }
    }

    if (!moduleData.units.flatMap(u => u.exercises || []).some(e => e.scaffoldLevel === 'project')) {
        tips.push({ icon: '🏗️', text: 'Every module benefits from a Capstone Project exercise — it\'s where real learning consolidation happens.' });
    }

    if (tips.length === 0) {
        tips.push({ icon: '✨', text: 'Looking good! Your course design follows strong pedagogical principles.' });
    }

    return tips;
}

// Scaffold level styling
const SCAFFOLD_STYLES = {
    guided: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500', label: 'Guided' },
    semi_guided: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', dot: 'bg-blue-500', label: 'Semi-Guided' },
    independent: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', dot: 'bg-amber-500', label: 'Independent' },
    project: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400', dot: 'bg-purple-500', label: 'Capstone Project' },
};

const DIFFICULTY_STYLES = {
    beginner: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800',
    intermediate: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
    advanced: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
};


export default function PedagogyBuilderPage() {
    const router = useRouter();
    const { id } = useParams();
    const { user, isAuthenticated, _hasHydrated } = useAuthStore();

    const [moduleData, setModuleData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeUnitId, setActiveUnitId] = useState(null);

    // AI Copilot state
    const [showAiCopilot, setShowAiCopilot] = useState(false);
    const [aiCopilotTab, setAiCopilotTab] = useState('exercise');

    // Modals
    const [showUnitModal, setShowUnitModal] = useState(false);
    const [unitForm, setUnitForm] = useState({ title: '', description: '', expectedHours: 5, unlockThreshold: 80, unitNumber: 1 });

    const [showExerciseModal, setShowExerciseModal] = useState(false);
    const [exerciseForm, setExerciseForm] = useState({
        title: '', description: '', theory: '', exerciseType: 'coding', difficulty: 'beginner', scaffoldLevel: 'guided',
        bloomsLevel: 'understand', learningObjective: '',
        isReviewExercise: false, timeLimit: 5, xpReward: 10, starterCode: '', solutionCode: '',
        testCases: [], hints: [],
        mcqData: {
            question: 'What is the output of this code snippet?',
            codeSnippet: 'print("Hello World")',
            options: ['Hello World', 'None', 'SyntaxError', 'undefined'],
            correctOption: 0,
            explanation: 'The print function writes to standard output.'
        },
        clozeData: {
            instruction: 'Fill in the blank:',
            template: 'for i in {{BLANK_1}}(5):\n    print(i)',
            blanks: [{ id: 'BLANK_1', correctAnswer: 'range', hint: 'Sequence generator' }],
            explanation: 'range(5) produces numbers 0 to 4'
        },
        caseStudyData: {
            company: 'TechCorp Cloud',
            incident: 'High memory usage during batch processing',
            scenarioCode: '# Inefficient memory usage\ndata = [x for x in range(10000000)]',
            questions: [
                {
                    id: 'q1',
                    prompt: 'How would you fix memory consumption without eager list allocation?',
                    options: ['Use a generator expression (x for x in range(...))', 'Use a global variable', 'Use recursion', 'Allocate larger swap space'],
                    correctOption: 0,
                    explanation: 'Generators yield items on demand with O(1) memory.'
                }
            ]
        },
        arData: {
            assertion: 'In Python, strings are immutable sequences.',
            reason: 'Individual character elements of a string cannot be modified via item assignment s[0] = "x".',
            correctOption: 0,
            explanation: 'Both statements are true facts, and Reason explains what immutability means.'
        },
        traceData: {
            codeSnippet: 'a = 2\nb = 5\nfor i in range(1, 4):\n    a = a + i\n    b = b * 2',
            tableHeaders: ['Step (i)', 'Value of a', 'Value of b'],
            expectedRows: [
                ['1', '3', '10'],
                ['2', '5', '20'],
                ['3', '8', '40']
            ],
            explanation: 'Variable values update sequentially during each loop iteration.'
        },
        debugData: {
            buggyCode: 'def calculate(nums):\n    total = 0\n    for n in nums\n        total += n\n    return total',
            errors: [
                { line: 3, description: 'Missing colon at end of for loop statement', correctedLine: '    for n in nums:' }
            ],
            solutionCode: 'def calculate(nums):\n    total = 0\n    for n in nums:\n        total += n\n    return total',
            explanation: 'Line 3 was missing a required colon (:).'
        }
    });

    // Unit Theory Modal
    const [showTheoryModal, setShowTheoryModal] = useState(false);
    const [theoryForm, setTheoryForm] = useState({
        unitId: null,
        title: '',
        summary: '',
        content: '',
        miniCheckpoints: [],
        cbseTips: []
    });

    // Config Modal
    const [showConfigModal, setShowConfigModal] = useState(false);
    const [configForm, setConfigForm] = useState({ useBlooms: false, useObjectives: false, useTimeLimit: false });

    // Editing State Trackers
    const [editingUnitId, setEditingUnitId] = useState(null);
    const [editingExerciseId, setEditingExerciseId] = useState(null);

    // Assign modal
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [classes, setClasses] = useState([]);
    const [selectedClasses, setSelectedClasses] = useState([]);
    const [selectedGroups, setSelectedGroups] = useState([]);
    const [assignDeadline, setAssignDeadline] = useState('');
    const [assignNotes, setAssignNotes] = useState('');
    const [existingAssignments, setExistingAssignments] = useState([]);

    // Auto-Save exercise draft state
    const [builderSavedTime, setBuilderSavedTime] = useState(null);

    // Inline AI Challenge Generation State (Exercise Modal)
    const [inlineAiPrompt, setInlineAiPrompt] = useState('');
    const [inlineAiProvider, setInlineAiProvider] = useState('groq');
    const [inlineAiLoading, setInlineAiLoading] = useState(false);

    // Inline AI Theory Generation State (Theory Modal)
    const [inlineAiTheoryPrompt, setInlineAiTheoryPrompt] = useState('');
    const [inlineAiTheoryLoading, setInlineAiTheoryLoading] = useState(false);

    // Edit Course Meta Modal
    const [showEditModuleModal, setShowEditModuleModal] = useState(false);
    const [moduleEditForm, setModuleEditForm] = useState({
        title: '',
        titleHindi: '',
        description: '',
        language: 'python',
        boardAligned: 'CBSE',
        classLevel: 11
    });

    // Enforce SINGLE active modal at any given time (Zero Modal Stacking)
    const closeAllModals = () => {
        setShowAiCopilot(false);
        setShowExerciseModal(false);
        setShowTheoryModal(false);
        setShowUnitModal(false);
        setShowConfigModal(false);
        setShowAssignModal(false);
        setShowEditModuleModal(false);
    };

    const handleOpenEditModule = () => {
        closeAllModals();
        setModuleEditForm({
            title: moduleData?.title || '',
            titleHindi: moduleData?.titleHindi || '',
            description: moduleData?.description || '',
            language: moduleData?.language || 'python',
            boardAligned: moduleData?.boardAligned || 'CBSE',
            classLevel: moduleData?.classLevel || 11
        });
        setShowEditModuleModal(true);
    };

    const handleSaveModuleMeta = async (e) => {
        e.preventDefault();
        if (!moduleEditForm.title.trim()) {
            toast.error('Course title is required');
            return;
        }
        try {
            await trainingAPI.updateModule(id, moduleEditForm);
            toast.success('Course settings updated successfully!');
            setShowEditModuleModal(false);
            loadData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update course settings');
        }
    };

    const handleInlineAiGenerateExercise = async () => {
        if (!inlineAiPrompt.trim()) return;
        setInlineAiLoading(true);
        try {
            const activeUnit = moduleData?.units?.find(u => u.id === activeUnitId);
            const res = await api.post('/training/ai/exercise', {
                prompt: inlineAiPrompt,
                exerciseType: exerciseForm.exerciseType,
                difficulty: exerciseForm.difficulty || 'beginner',
                scaffoldLevel: exerciseForm.scaffoldLevel || 'guided',
                bloomsLevel: exerciseForm.bloomsLevel || 'apply',
                language: moduleData?.language || 'python',
                classLevel: moduleData?.classLevel || 11,
                board: moduleData?.boardAligned || 'CBSE',
                unitTitle: activeUnit?.title || '',
                provider: inlineAiProvider
            });

            if (res.data.success && res.data.data.exercise) {
                const ex = res.data.data.exercise;
                handleApplyAiExercise(ex);
                toast.success(`✨ Challenge for "${ex.title}" auto-filled into form!`);
            } else {
                toast.error('AI synthesis did not return an exercise');
            }
        } catch (err) {
            console.error('Inline AI Exercise generation error:', err);
            toast.error(err.response?.data?.message || 'Failed to synthesize exercise');
        } finally {
            setInlineAiLoading(false);
        }
    };

    const handleInlineAiGenerateTheory = async () => {
        const topicToUse = inlineAiTheoryPrompt.trim() || theoryForm.title || 'Unit Theory';
        setInlineAiTheoryLoading(true);
        try {
            const res = await api.post('/training/ai/theory', {
                topic: topicToUse,
                unitTitle: theoryForm.title,
                language: moduleData?.language || 'python',
                classLevel: moduleData?.classLevel || 11,
                board: moduleData?.boardAligned || 'CBSE',
                provider: 'groq'
            });
            if (res.data.success && res.data.data.theory) {
                const t = res.data.data.theory;
                setTheoryForm(prev => ({
                    ...prev,
                    summary: t.summary || prev.summary || `Core concepts of ${theoryForm.title}`,
                    content: t.contentMarkdown || t.theoryMarkdown || t.content || prev.content,
                    miniCheckpoints: Array.isArray(t.miniCheckpoints) && t.miniCheckpoints.length > 0 ? t.miniCheckpoints : prev.miniCheckpoints,
                    cbseTips: Array.isArray(t.cbseTips) && t.cbseTips.length > 0 ? t.cbseTips : prev.cbseTips
                }));
                toast.success('✨ Unit Pre-Lab notes, checkpoints & tips generated into form!');
            } else {
                toast.error('AI did not return theory content');
            }
        } catch (err) {
            console.error('Inline AI Theory error:', err);
            toast.error(err.response?.data?.message || 'Failed to synthesize theory');
        } finally {
            setInlineAiTheoryLoading(false);
        }
    };

    // Test Cases handlers
    const handleAddTestCase = () => {
        setExerciseForm(f => ({
            ...f,
            testCases: [...(f.testCases || []), { input: '', expectedOutput: '', isHidden: false }]
        }));
    };

    const handleTestCaseChange = (index, field, value) => {
        setExerciseForm(f => ({
            ...f,
            testCases: (f.testCases || []).map((tc, i) => i === index ? { ...tc, [field]: value } : tc)
        }));
    };

    const handleRemoveTestCase = (index) => {
        setExerciseForm(f => ({
            ...f,
            testCases: (f.testCases || []).filter((_, i) => i !== index)
        }));
    };

    useEffect(() => {
        if (typeof window === 'undefined' || !showExerciseModal) return;
        const timer = setTimeout(() => {
            if (exerciseForm.title || exerciseForm.description) {
                try {
                    localStorage.setItem(`ulrms_builder_exercise_${id}`, JSON.stringify({
                        exerciseForm,
                        timestamp: Date.now()
                    }));
                    setBuilderSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
                } catch (e) {}
            }
        }, 800);
        return () => clearTimeout(timer);
    }, [exerciseForm, showExerciseModal, id]);

    useEffect(() => {
        if (!_hasHydrated) return;
        if (!isAuthenticated) return;
        loadData();
    }, [isAuthenticated, _hasHydrated, id]);

    const loadData = async () => {
        try {
            const [modRes, classesRes] = await Promise.all([
                trainingAPI.getModuleDetails(id),
                classesAPI.getAll().catch(() => ({ data: { data: { classes: [] } } }))
            ]);
            const mod = modRes.data.data.module;
            setModuleData(mod);
            setConfigForm(mod.pedagogyConfig || { useBlooms: false, useObjectives: false, useTimeLimit: false });
            setClasses(classesRes.data?.data?.classes || []);
            setUnitForm(f => ({ ...f, unitNumber: (mod.units?.length || 0) + 1 }));
            if (!activeUnitId && mod.units?.length > 0) {
                setActiveUnitId(mod.units[0].id);
            }
            // Load existing assignments
            try {
                const assignRes = await trainingAPI.getModuleAssignments(id);
                setExistingAssignments(assignRes.data?.data?.assignments || []);
            } catch {}
        } catch (error) {
            toast.error('Failed to load builder data');
            router.push('/admin/training');
        } finally {
            setLoading(false);
        }
    };

    const activeUnit = useMemo(() => moduleData?.units?.find(u => u.id === activeUnitId), [moduleData, activeUnitId]);
    const pedagogyScore = useMemo(() => computePedagogyScore(moduleData), [moduleData]);
    const designTips = useMemo(() => getDesignTips(moduleData, activeUnit), [moduleData, activeUnit]);

    // Unit Actions
    const handleOpenCreateUnit = () => {
        closeAllModals();
        setEditingUnitId(null);
        setUnitForm({
            title: '',
            description: '',
            expectedHours: 5,
            unlockThreshold: 80,
            unitNumber: (moduleData?.units?.length || 0) + 1
        });
        setShowUnitModal(true);
    };

    const handleOpenEditUnit = (unit) => {
        if (!unit) return;
        closeAllModals();
        setEditingUnitId(unit.id);
        setUnitForm({
            title: unit.title || '',
            description: unit.description || '',
            expectedHours: unit.expectedHours || 5,
            unlockThreshold: unit.unlockThreshold ?? 80,
            unitNumber: unit.unitNumber || 1
        });
        setShowUnitModal(true);
    };

    const handleSaveUnit = async () => {
        try {
            if (editingUnitId) {
                await trainingAPI.updateUnit(editingUnitId, unitForm);
                toast.success('Unit updated successfully');
            } else {
                await trainingAPI.createUnit(id, unitForm);
                toast.success('Unit created with mastery gate');
            }
            setShowUnitModal(false);
            setEditingUnitId(null);
            setUnitForm({ title: '', description: '', expectedHours: 5, unlockThreshold: 80, unitNumber: (moduleData?.units?.length || 0) + 2 });
            loadData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error saving unit');
        }
    };

    const handleDeleteUnit = async (unitId) => {
        if (!confirm('Are you sure you want to delete this unit and all its exercises?')) return;
        try {
            await trainingAPI.deleteUnit(unitId);
            toast.success('Unit deleted');
            if (activeUnitId === unitId) {
                setActiveUnitId(null);
            }
            loadData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error deleting unit');
        }
    };

    // Exercise Actions
    const handleOpenCreateExercise = () => {
        closeAllModals();
        setEditingExerciseId(null);
        setExerciseForm({
            title: '',
            description: '',
            theory: '',
            exerciseType: 'coding',
            difficulty: 'beginner',
            scaffoldLevel: 'guided',
            bloomsLevel: 'understand',
            learningObjective: '',
            isReviewExercise: false,
            timeLimit: 5,
            xpReward: 10,
            starterCode: '',
            solutionCode: '',
            testCases: [
                { input: '', expectedOutput: '', isHidden: false }
            ],
            hints: [''],
            mcqData: {
                question: 'What is the output of this code snippet?',
                codeSnippet: 'print("Hello World")',
                options: ['Hello World', 'None', 'SyntaxError', 'undefined'],
                correctOption: 0,
                explanation: 'The print function writes to standard output.'
            },
            clozeData: {
                instruction: 'Fill in the blank:',
                template: 'for i in {{BLANK_1}}(5):\n    print(i)',
                blanks: [{ id: 'BLANK_1', correctAnswer: 'range', hint: 'Sequence generator' }],
                explanation: 'range(5) produces numbers 0 to 4'
            },
            caseStudyData: {
                company: 'TechCorp Cloud',
                incident: 'High memory usage during batch processing',
                scenarioCode: '# Inefficient memory usage\ndata = [x for x in range(10000000)]',
                questions: [
                    {
                        id: 'q1',
                        prompt: 'How would you fix memory consumption without eager list allocation?',
                        options: ['Use a generator expression (x for x in range(...))', 'Use a global variable', 'Use recursion', 'Allocate larger swap space'],
                        correctOption: 0,
                        explanation: 'Generators yield items on demand with O(1) memory.'
                    }
                ]
            }
        });
        setShowExerciseModal(true);
    };

    const handleOpenEditExercise = (ex) => {
        if (!ex) return;
        closeAllModals();
        setEditingExerciseId(ex.id);

        let parsedTestCases = [];
        let mcq = null;
        let cloze = null;
        let caseStudy = null;
        let ar = null;
        let trace = null;
        let debug = null;

        if (ex.testCases) {
            const raw = typeof ex.testCases === 'string' ? JSON.parse(ex.testCases) : ex.testCases;
            if (Array.isArray(raw)) {
                parsedTestCases = raw;
            } else if (typeof raw === 'object') {
                if (ex.exerciseType === 'mcq') mcq = raw;
                else if (ex.exerciseType === 'fill_blank') cloze = raw;
                else if (ex.exerciseType === 'case_study') caseStudy = raw;
                else if (ex.exerciseType === 'assertion_reason') ar = raw;
                else if (ex.exerciseType === 'code_trace') trace = raw;
                else if (ex.exerciseType === 'code_debug') debug = raw;
            }
        }

        let parsedHints = [];
        if (ex.hints) {
            parsedHints = typeof ex.hints === 'string' ? JSON.parse(ex.hints) : ex.hints;
            if (!Array.isArray(parsedHints)) parsedHints = [String(parsedHints)];
        }

        setExerciseForm({
            title: ex.title || '',
            description: ex.description || '',
            theory: '',
            exerciseType: ex.exerciseType || 'coding',
            difficulty: ex.difficulty || 'beginner',
            scaffoldLevel: ex.scaffoldLevel || 'guided',
            bloomsLevel: ex.bloomsLevel || 'apply',
            learningObjective: ex.learningObjective || '',
            isReviewExercise: ex.isReviewExercise || false,
            timeLimit: ex.timeLimit || 5,
            xpReward: ex.xpReward || 10,
            starterCode: ex.starterCode || '',
            solutionCode: ex.solutionCode || '',
            testCases: parsedTestCases.length > 0 ? parsedTestCases : [{ input: '', expectedOutput: '', isHidden: false }],
            hints: parsedHints.length > 0 ? parsedHints : [''],
            mcqData: mcq || {
                question: 'What is the output of this code snippet?',
                codeSnippet: '',
                options: ['', '', '', ''],
                correctOption: 0,
                explanation: ''
            },
            clozeData: cloze || {
                instruction: 'Fill in the blank:',
                template: '',
                blanks: [{ id: 'BLANK_1', correctAnswer: '', hint: '' }],
                explanation: ''
            },
            caseStudyData: caseStudy || {
                company: '',
                incident: '',
                scenarioCode: '',
                questions: []
            },
            arData: ar || {
                assertion: '',
                reason: '',
                correctOption: 0,
                explanation: ''
            },
            traceData: trace || {
                codeSnippet: '',
                tableHeaders: ['Step', 'Var A', 'Var B'],
                expectedRows: [['1', '', '']],
                explanation: ''
            },
            debugData: debug || {
                buggyCode: '',
                errors: [{ line: 1, description: '', correctedLine: '' }],
                solutionCode: '',
                explanation: ''
            }
        });
        setShowExerciseModal(true);
    };

    const handleSaveExercise = async () => {
        if (!activeUnitId && !editingExerciseId) return;
        try {
            // Merge theory into description if provided
            const fullDescription = exerciseForm.theory
                ? `## 📖 Learning Content\n\n${exerciseForm.theory}\n\n---\n\n## 🎯 Problem Statement\n\n${exerciseForm.description}`
                : exerciseForm.description;

            let processedTestCases = exerciseForm.testCases;
            if (exerciseForm.exerciseType === 'mcq') {
                processedTestCases = exerciseForm.mcqData;
            } else if (exerciseForm.exerciseType === 'fill_blank') {
                processedTestCases = exerciseForm.clozeData;
            } else if (exerciseForm.exerciseType === 'case_study') {
                processedTestCases = exerciseForm.caseStudyData;
            } else if (exerciseForm.exerciseType === 'assertion_reason') {
                processedTestCases = exerciseForm.arData;
            } else if (exerciseForm.exerciseType === 'code_trace') {
                processedTestCases = exerciseForm.traceData;
            } else if (exerciseForm.exerciseType === 'code_debug') {
                processedTestCases = exerciseForm.debugData;
            }

            const payload = {
                title: exerciseForm.title,
                description: fullDescription,
                exerciseType: exerciseForm.exerciseType,
                difficulty: exerciseForm.difficulty,
                scaffoldLevel: exerciseForm.scaffoldLevel,
                bloomsLevel: exerciseForm.bloomsLevel,
                learningObjective: exerciseForm.learningObjective,
                isReviewExercise: exerciseForm.isReviewExercise,
                timeLimit: exerciseForm.timeLimit,
                xpReward: exerciseForm.xpReward,
                starterCode: exerciseForm.starterCode,
                solutionCode: exerciseForm.solutionCode,
                testCases: JSON.stringify(processedTestCases),
                hints: JSON.stringify(exerciseForm.hints),
            };

            if (editingExerciseId) {
                await trainingAPI.updateExercise(editingExerciseId, payload);
                toast.success('Exercise updated successfully');
            } else {
                await trainingAPI.createExercise(activeUnitId, payload);
                toast.success('Exercise deployed with pedagogy rules');
            }
            localStorage.removeItem(`ulrms_builder_exercise_${id}`);
            setShowExerciseModal(false);
            setEditingExerciseId(null);
            loadData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error saving exercise');
        }
    };

    const handleDeleteExercise = async (exerciseId) => {
        if (!confirm('Are you sure you want to delete this exercise?')) return;
        try {
            await trainingAPI.deleteExercise(exerciseId);
            toast.success('Exercise deleted');
            loadData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error deleting exercise');
        }
    };

    const handleOpenEditTheory = async (unit) => {
        if (!unit) return;
        closeAllModals();
        try {
            const res = await trainingAPI.getUnitTheory(unit.id);
            const data = res.data?.data?.unit || {};
            setTheoryForm({
                unitId: unit.id,
                title: data.title || unit.title,
                summary: data.summary || '',
                content: data.content || '',
                miniCheckpoints: Array.isArray(data.miniCheckpoints) ? data.miniCheckpoints : [],
                cbseTips: Array.isArray(data.cbseTips) ? data.cbseTips : []
            });
            setShowTheoryModal(true);
        } catch (err) {
            console.error(err);
            toast.error('Failed to load unit theory');
        }
    };

    const handleSaveTheory = async () => {
        if (!theoryForm.unitId) return;
        try {
            await trainingAPI.updateUnitTheory(theoryForm.unitId, {
                summary: theoryForm.summary,
                content: theoryForm.content,
                miniCheckpoints: theoryForm.miniCheckpoints,
                cbseTips: theoryForm.cbseTips
            });
            toast.success('📖 Unit Pre-Lab Theory & Checkpoints saved!');
            setShowTheoryModal(false);
            loadData();
        } catch (err) {
            console.error(err);
            toast.error('Failed to save unit theory');
        }
    };

    const handleApplyAiExercise = (aiEx) => {
        if (!aiEx) return;
        closeAllModals();
        const currentType = aiEx.exerciseType || exerciseForm.exerciseType || 'coding';
        setExerciseForm(prev => ({
            ...prev,
            title: aiEx.title || prev.title,
            description: aiEx.problemStatement || aiEx.description || prev.description,
            exerciseType: currentType,
            difficulty: aiEx.difficulty || prev.difficulty,
            scaffoldLevel: aiEx.scaffoldLevel || prev.scaffoldLevel,
            bloomsLevel: aiEx.bloomsLevel || prev.bloomsLevel,
            theory: aiEx.theory || prev.theory,
            starterCode: aiEx.starterCode || '',
            solutionCode: aiEx.solutionCode || '',
            testCases: Array.isArray(aiEx.testCases) ? aiEx.testCases : prev.testCases,
            hints: aiEx.hints || prev.hints,
            mcqData: currentType === 'mcq' && typeof aiEx.testCases === 'object' ? aiEx.testCases : prev.mcqData,
            clozeData: currentType === 'fill_blank' && typeof aiEx.testCases === 'object' ? aiEx.testCases : prev.clozeData,
            caseStudyData: currentType === 'case_study' && typeof aiEx.testCases === 'object' ? aiEx.testCases : prev.caseStudyData,
            arData: currentType === 'assertion_reason' && typeof aiEx.testCases === 'object' ? aiEx.testCases : prev.arData,
            traceData: currentType === 'code_trace' && typeof aiEx.testCases === 'object' ? aiEx.testCases : prev.traceData,
            debugData: currentType === 'code_debug' && typeof aiEx.testCases === 'object' ? {
                buggyCode: aiEx.starterCode || aiEx.testCases.buggyCode || '',
                errors: aiEx.testCases.errors || [{ line: 1, description: '', correctedLine: '' }],
                solutionCode: aiEx.solutionCode || aiEx.testCases.solutionCode || '',
                explanation: aiEx.testCases.explanation || ''
            } : prev.debugData
        }));
        setShowExerciseModal(true);
    };

    const handleApplyAiTheory = (theoryRes) => {
        if (!theoryRes) return;
        closeAllModals();
        setExerciseForm(prev => ({
            ...prev,
            title: prev.title || theoryRes.title || '',
            theory: theoryRes.theoryMarkdown || prev.theory
        }));
        setShowExerciseModal(true);
    };

    const handleApplyAiOutline = async (outlineRes) => {
        if (!outlineRes || !outlineRes.units) return;
        closeAllModals();
        try {
            for (const u of outlineRes.units) {
                const uRes = await trainingAPI.createUnit(id, {
                    unitNumber: u.unitNumber || (moduleData.units?.length || 0) + 1,
                    title: u.title,
                    description: u.description || '',
                    expectedHours: u.expectedHours || 5,
                    unlockThreshold: u.unlockThreshold || 80
                });
                const unitId = uRes.data.data.unit.id;
                if (u.exercises && u.exercises.length > 0) {
                    for (let eIdx = 0; eIdx < u.exercises.length; eIdx++) {
                        const ex = u.exercises[eIdx];
                        await trainingAPI.createExercise(unitId, {
                            title: ex.title,
                            description: ex.description,
                            exerciseType: ex.exerciseType || 'coding',
                            difficulty: ex.difficulty || 'beginner',
                            scaffoldLevel: ex.scaffoldLevel || 'guided',
                            bloomsLevel: ex.bloomsLevel || 'apply',
                            learningObjective: ex.learningObjective || '',
                            isReviewExercise: ex.isReviewExercise || false,
                            xpReward: Number(ex.xpReward) || 15,
                            timeLimit: Number(ex.timeLimit) || 5,
                            sequenceOrder: eIdx,
                            starterCode: ex.starterCode || null,
                            solutionCode: ex.solutionCode || null,
                            testCases: JSON.stringify(ex.testCases || []),
                            hints: JSON.stringify(ex.hints || [])
                        });
                    }
                }
            }
            toast.success('🎉 AI Blueprint Units & Exercises created in course!');
            loadData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to auto-deploy units');
        }
    };

    // Test case helpers
    const addTestCase = () => setExerciseForm(f => ({ ...f, testCases: [...f.testCases, { input: '', expectedOutput: '', isHidden: false }] }));
    const removeTestCase = (idx) => setExerciseForm(f => ({ ...f, testCases: f.testCases.filter((_, i) => i !== idx) }));
    const updateTestCase = (idx, field, value) => setExerciseForm(f => ({
        ...f, testCases: f.testCases.map((tc, i) => i === idx ? { ...tc, [field]: value } : tc)
    }));

    // Hint helpers
    const addHint = () => setExerciseForm(f => ({ ...f, hints: [...f.hints, ''] }));
    const removeHint = (idx) => setExerciseForm(f => ({ ...f, hints: f.hints.filter((_, i) => i !== idx) }));
    const updateHint = (idx, value) => setExerciseForm(f => ({ ...f, hints: f.hints.map((h, i) => i === idx ? value : h) }));

    if (loading || !moduleData) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
            <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
        </div>
    );

    // --- Circular Score Gauge ---
    const ScoreGauge = ({ score }) => {
        const circumference = 2 * Math.PI * 40;
        const strokeDashoffset = circumference - (score / 100) * circumference;
        const color = score >= 80 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
        return (
            <div className="relative w-28 h-28 mx-auto">
                <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="8" className="text-slate-100 dark:text-slate-800" />
                    <circle cx="50" cy="50" r="40" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
                        strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
                        style={{ transition: 'stroke-dashoffset 1s ease' }} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-slate-900 dark:text-white">{score}</span>
                    <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">/100</span>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            {/* Top Bar */}
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30">
                <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button onClick={() => router.push('/admin/training')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition">
                                <ArrowLeft className="w-5 h-5 text-slate-500" />
                            </button>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h1 className="text-lg font-bold text-slate-900 dark:text-white">{moduleData.title}</h1>
                                    <span className={`badge text-[10px] ${moduleData.isPublished ? 'badge-success' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                                        {moduleData.isPublished ? 'Published' : 'Draft'}
                                    </span>
                                    <span className="text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                        {builderSavedTime ? `Draft Auto-saved ${builderSavedTime}` : 'Auto-Save Active'}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 font-medium mt-0.5">
                                    Pedagogy Builder • {moduleData.language} • {moduleData.boardAligned || 'Custom'} Class {moduleData.classLevel || '—'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => { closeAllModals(); setAiCopilotTab('outline'); setShowAiCopilot(true); }}
                                className="btn bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 text-white font-bold text-sm shadow-md shadow-indigo-500/25 flex items-center gap-1.5"
                            >
                                <Sparkles className="w-4 h-4" /> ✨ AI LMS Copilot
                            </button>
                            <button onClick={handleOpenEditModule} className="btn btn-secondary text-sm flex items-center gap-1.5">
                                <Edit3 className="w-4 h-4 text-slate-500" /> Edit Course
                            </button>
                            <button onClick={() => { closeAllModals(); setShowConfigModal(true); }} className="btn btn-secondary text-sm">
                                <Settings className="w-4 h-4" /> Configure UI
                            </button>
                            <button
                                onClick={async () => {
                                    try {
                                        await trainingAPI.togglePublish(id);
                                        toast.success(moduleData.isPublished ? 'Module unpublished' : 'Module published');
                                        loadData();
                                    } catch { toast.error('Failed to toggle publish'); }
                                }}
                                className={`btn text-sm ${moduleData.isPublished ? 'btn-secondary' : 'bg-emerald-600 hover:bg-emerald-500 text-white border-none'}`}
                            >
                                <Globe className="w-4 h-4" /> {moduleData.isPublished ? 'Unpublish' : 'Publish'}
                            </button>
                            <button onClick={() => { closeAllModals(); setShowAssignModal(true); }} className="btn bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-lg shadow-primary-500/25 hover:shadow-xl text-sm">
                                <Send className="w-4 h-4" /> Assign to Class
                            </button>
                            <button onClick={handleOpenCreateUnit} className="btn btn-primary text-sm">
                                <Plus className="w-4 h-4" /> Add Unit
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* 3-Column Layout */}
            <div className="max-w-[1600px] mx-auto flex" style={{ height: 'calc(100vh - 65px)' }}>

                {/* Column 1: Course Flow Timeline */}
                <div className="w-[260px] shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-y-auto p-4">
                    <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">Course Flow</h3>

                    {moduleData.units?.length === 0 ? (
                        <div className="text-center py-8">
                            <Layers className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                            <p className="text-sm text-slate-500">No units yet</p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {moduleData.units?.map((unit, idx) => {
                                const exerciseScaffolds = unit.exercises?.map(e => e.scaffoldLevel) || [];
                                const dominantScaffold = exerciseScaffolds[0] || 'guided';
                                const style = SCAFFOLD_STYLES[dominantScaffold] || SCAFFOLD_STYLES.guided;
                                const isActive = activeUnitId === unit.id;

                                return (
                                    <div key={unit.id} className="group relative">
                                        {/* Mastery Gate */}
                                        {idx > 0 && (
                                            <div className="flex items-center justify-center py-1.5">
                                                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
                                                    <Lock className="w-3 h-3" />
                                                    <span>≥ {unit.unlockThreshold}% mastery</span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Unit Node */}
                                        <div
                                            onClick={() => setActiveUnitId(unit.id)}
                                            className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between gap-2 cursor-pointer ${
                                                isActive
                                                    ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-500 text-primary-900 dark:text-primary-100 shadow-sm'
                                                    : 'bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                <div className="w-7 h-7 rounded-lg bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300 font-bold text-xs flex items-center justify-center shrink-0">
                                                    {unit.unitNumber}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="text-xs font-bold truncate">{unit.title}</div>
                                                    <div className="text-[10px] text-slate-400 mt-0.5">{unit.exercises?.length || 0} exercises</div>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleOpenEditUnit(unit);
                                                }}
                                                className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                                title="Edit Unit"
                                            >
                                                <Edit3 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>

                                        {/* Connector line */}
                                        {idx < moduleData.units.length - 1 && (
                                            <div className="flex justify-center">
                                                <div className="w-0.5 h-2 bg-slate-200 dark:bg-slate-700" />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {/* Certification milestone */}
                            <div className="flex items-center justify-center pt-2">
                                <div className="w-0.5 h-3 bg-slate-200 dark:bg-slate-700" />
                            </div>
                            <div className="flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-amber-600 dark:text-amber-400">
                                <Trophy className="w-4 h-4" />
                                <span>Certification</span>
                            </div>
                        </div>
                    )}

                    <button
                        onClick={handleOpenCreateUnit}
                        className="w-full mt-4 py-2.5 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-500 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center justify-center gap-1.5"
                    >
                        <Plus className="w-4 h-4" /> Add Unit
                    </button>
                </div>

                {/* Column 2: Active Unit Exercise Studio */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-950">
                    {activeUnit ? (
                        <div className="max-w-4xl mx-auto space-y-6">
                            {/* Unit Overview Card */}
                            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-semibold text-primary-600 dark:text-primary-400 uppercase tracking-wider">Unit {activeUnit.unitNumber}</span>
                                            {activeUnit.unlockThreshold > 0 && (
                                                <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 px-2 py-0.5 rounded-full font-bold">
                                                    Mastery Gate: {activeUnit.unlockThreshold}%
                                                </span>
                                            )}
                                        </div>
                                        <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">{activeUnit.title}</h2>
                                        {activeUnit.description && (
                                            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{activeUnit.description}</p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button
                                            onClick={() => handleOpenEditUnit(activeUnit)}
                                            className="btn btn-secondary text-xs py-2 px-3 rounded-xl flex items-center gap-1 font-bold"
                                            title="Edit Unit Title / Description"
                                        >
                                            <Edit3 className="w-3.5 h-3.5" /> Edit Unit
                                        </button>
                                        <button
                                            onClick={() => handleOpenEditTheory(activeUnit)}
                                            className="btn bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/80 dark:text-indigo-300 text-xs py-2 px-3 rounded-xl flex items-center gap-1.5 font-bold border border-indigo-200 dark:border-indigo-800"
                                            title="Edit Pre-Lab Concept Notes & Mini-Checkpoints"
                                        >
                                            <BookOpen className="w-3.5 h-3.5 text-indigo-500" /> Theory & Checks
                                        </button>
                                        <button
                                            onClick={() => handleDeleteUnit(activeUnit.id)}
                                            className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-slate-200 dark:border-slate-800 transition"
                                            title="Delete Unit"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={handleOpenCreateExercise}
                                            className="btn bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 text-white font-bold text-xs py-2 px-3.5 rounded-xl flex items-center gap-1.5 shadow-sm"
                                        >
                                            <Sparkles className="w-3.5 h-3.5" /> AI Challenge Studio
                                        </button>
                                        <button onClick={handleOpenCreateExercise} className="btn btn-primary text-xs py-2 px-3.5 rounded-xl flex items-center gap-1.5 font-bold">
                                            <Plus className="w-3.5 h-3.5" /> Add Exercise
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Exercises List in Active Unit */}
                            <div className="space-y-3">
                                {activeUnit.exercises?.length === 0 ? (
                                    <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-8">
                                        <Code2 className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                                        <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm">No Exercises in this Unit</h4>
                                        <p className="text-xs text-slate-400 mt-1">Use the buttons above to craft exercises across all 5 question types or synthesize them with AI.</p>
                                    </div>
                                ) : (
                                    activeUnit.exercises?.map((ex, idx) => {
                                        const typeBadges = {
                                            coding: { label: '⚡ Coding Lab', bg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' },
                                            mcq: { label: '📝 Output MCQ', bg: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' },
                                            fill_blank: { label: '🧩 Syntax Cloze', bg: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300' },
                                            bug_fix: { label: '🐞 Bug Hunt', bg: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' },
                                            case_study: { label: '🏢 Case Study', bg: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' },
                                            assertion_reason: { label: '⚖️ Assertion-Reason', bg: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300' },
                                            code_trace: { label: '🔍 Dry-Run Trace', bg: 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300' },
                                            code_debug: { label: '🐞 CBSE Error Debug', bg: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' },
                                        };
                                        const badge = typeBadges[ex.exerciseType] || typeBadges.coding;

                                        return (
                                            <div
                                                key={ex.id}
                                                onClick={() => handleOpenEditExercise(ex)}
                                                className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-800 shadow-sm flex items-center justify-between gap-4 cursor-pointer transition group"
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 font-bold text-xs text-slate-500 flex items-center justify-center shrink-0">
                                                        {idx + 1}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <h5 className="font-bold text-sm text-slate-900 dark:text-white truncate group-hover:text-indigo-600 transition">{ex.title}</h5>
                                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.bg}`}>
                                                                {badge.label}
                                                            </span>
                                                            <span className="text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded capitalize">
                                                                {ex.scaffoldLevel}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-slate-400 truncate mt-1">{ex.description}</p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 shrink-0">
                                                    <span className="text-xs font-bold text-amber-500 flex items-center gap-1 mr-2">
                                                        <Award className="w-3.5 h-3.5" /> +{ex.xpReward || 10} XP
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleOpenEditExercise(ex);
                                                        }}
                                                        className="btn btn-secondary text-xs py-1.5 px-3 rounded-xl flex items-center gap-1 font-semibold"
                                                    >
                                                        <Edit3 className="w-3.5 h-3.5" /> Edit
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteExercise(ex.id);
                                                        }}
                                                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                                                        title="Delete Exercise"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-20 text-slate-400">
                            <Layers className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                            <p className="text-sm">Select a unit from the left course flow to design exercises.</p>
                        </div>
                    )}
                </div>

                {/* Column 3: Pedagogy Coach Sidebar */}
                <div className="w-[300px] shrink-0 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-y-auto p-5 space-y-6">
                    <div>
                        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Pedagogy Design Score</h3>
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-center">
                            <div className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">{pedagogyScore.score}/100</div>
                            <p className="text-[11px] text-slate-500 mt-1">Real-time instructional design quality index</p>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Design Coach Advice</h4>
                        <div className="space-y-2">
                            {designTips.map((tip, i) => (
                                <div key={i} className="p-2.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 text-xs text-indigo-900 dark:text-indigo-200 flex items-start gap-2">
                                    <span className="shrink-0 text-sm mt-0.5">{typeof tip === 'object' && tip.icon ? tip.icon : '✨'}</span>
                                    <span className="leading-relaxed">{typeof tip === 'object' && tip.text ? tip.text : String(tip)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* ====== EXERCISE BUILDER MODAL ====== */}
            {showExerciseModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[92vh] border border-slate-200 dark:border-slate-800 overflow-hidden">
                        {/* Header */}
                        <div className="p-5 border-b border-slate-200 dark:border-slate-800 shrink-0 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                    {editingExerciseId ? 'Edit Exercise / Challenge' : 'Exercise Studio'}
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">Design multi-modal challenges: Coding Labs, MCQs, Syntax Cloze, Bug Hunts, or CBSE Question Types</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowExerciseModal(false)}
                                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-600 transition"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 overflow-y-auto space-y-5">
                            {/* Inline In-Place AI Generator Bar */}
                            <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-transparent p-4 rounded-2xl border border-indigo-200 dark:border-indigo-800/80 space-y-2.5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 dark:text-indigo-300">
                                        <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
                                        <span>AI In-Place Challenge Synthesizer</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-slate-500 font-medium">Model:</span>
                                        <select
                                            value={inlineAiProvider}
                                            onChange={e => setInlineAiProvider(e.target.value)}
                                            className="text-[11px] font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-0.5"
                                        >
                                            <option value="groq">⚡ Groq (Fast)</option>
                                            <option value="gemini">✨ Gemini</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={inlineAiPrompt}
                                        onChange={e => setInlineAiPrompt(e.target.value)}
                                        placeholder={`Enter topic or concept (e.g., 'Trace while loop' or 'Assertion on list immutability')...`}
                                        className="input text-xs flex-1 py-2 bg-white dark:bg-slate-900 border-indigo-200 dark:border-indigo-800"
                                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleInlineAiGenerateExercise(); } }}
                                    />
                                    <button
                                        type="button"
                                        disabled={inlineAiLoading || !inlineAiPrompt.trim()}
                                        onClick={handleInlineAiGenerateExercise}
                                        className="btn bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2 px-4 rounded-xl shrink-0 flex items-center gap-1.5 shadow-md shadow-indigo-600/20 disabled:opacity-50 transition"
                                    >
                                        {inlineAiLoading ? (
                                            <>
                                                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                <span>Synthesizing...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="w-3.5 h-3.5" />
                                                <span>✨ Auto-Fill Challenge</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                                <p className="text-[10px] text-slate-400">
                                    Auto-fills Title, Problem Statement, Solution, and {exerciseForm.exerciseType === 'assertion_reason' ? 'Assertion/Reason statements' : exerciseForm.exerciseType === 'code_trace' ? 'Dry-Run trace table' : exerciseForm.exerciseType === 'code_debug' ? 'Error line and corrected code' : 'Test cases'} directly into this form without switching screens.
                                </p>
                            </div>

                            {/* Question Type Selector */}
                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2 block">
                                    Challenge / Question Type
                                </label>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                    {[
                                        { id: 'coding', label: '⚡ Coding Lab' },
                                        { id: 'mcq', label: '📝 Output MCQ' },
                                        { id: 'fill_blank', label: '🧩 Syntax Cloze' },
                                        { id: 'bug_fix', label: '🐞 Bug Hunt' },
                                        { id: 'case_study', label: '🏢 Case Study' },
                                        { id: 'assertion_reason', label: '⚖️ Assertion-Reason' },
                                        { id: 'code_trace', label: '🔍 Dry-Run Trace' },
                                        { id: 'code_debug', label: '🐞 CBSE Error Debug' }
                                    ].map(t => (
                                        <button
                                            key={t.id}
                                            type="button"
                                            onClick={() => setExerciseForm(f => ({ ...f, exerciseType: t.id }))}
                                            className={`p-2.5 rounded-xl text-xs font-bold border transition ${
                                                exerciseForm.exerciseType === t.id
                                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20'
                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-transparent'
                                            }`}
                                        >
                                            {t.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Basic Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Problem Title *</label>
                                    <input type="text" className="input" value={exerciseForm.title}
                                        onChange={e => setExerciseForm(f => ({ ...f, title: e.target.value }))}
                                        placeholder="e.g., Detect Palindrome Substrings" />
                                </div>
                                <div>
                                    <label className="label">XP Reward</label>
                                    <div className="relative">
                                        <Award className="w-4 h-4 absolute left-3 top-3.5 text-amber-500" />
                                        <input type="number" className="input pl-9 font-bold text-amber-500" value={exerciseForm.xpReward}
                                            onChange={e => setExerciseForm(f => ({ ...f, xpReward: parseInt(e.target.value) || 10 }))} />
                                    </div>
                                </div>
                            </div>

                            {/* Learning Content (Theory) */}
                            <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4">
                                <label className="label flex items-center gap-2 text-emerald-800 dark:text-emerald-400">
                                    <BookOpen className="w-4 h-4" /> Learning Content (Lesson Theory / Explanation)
                                </label>
                                <textarea className="input h-20 font-mono text-xs border-emerald-200 dark:border-emerald-800 mt-1" value={exerciseForm.theory}
                                    onChange={e => setExerciseForm(f => ({ ...f, theory: e.target.value }))}
                                    placeholder="Explain concept before problem..." />
                            </div>

                            <div>
                                <label className="label">Problem Statement / Instructions *</label>
                                <textarea className="input h-20 text-xs" value={exerciseForm.description}
                                    onChange={e => setExerciseForm(f => ({ ...f, description: e.target.value }))}
                                    placeholder="What the student must achieve..." />
                            </div>

                            {/* Pedagogy Layer */}
                            <div className="bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 rounded-2xl p-4 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1 block">Scaffold Level</label>
                                        <select className="input text-xs" value={exerciseForm.scaffoldLevel}
                                            onChange={e => setExerciseForm(f => ({ ...f, scaffoldLevel: e.target.value }))}>
                                            <option value="guided">🟢 Guided (Heavy Boilerplate)</option>
                                            <option value="semi_guided">🔵 Semi-Guided (Skeleton Code)</option>
                                            <option value="independent">🟠 Independent (Blank Canvas)</option>
                                            <option value="project">🟣 Capstone Project</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1 block">Difficulty</label>
                                        <select className="input text-xs capitalize" value={exerciseForm.difficulty}
                                            onChange={e => setExerciseForm(f => ({ ...f, difficulty: e.target.value }))}>
                                            <option value="beginner">Beginner</option>
                                            <option value="intermediate">Intermediate</option>
                                            <option value="advanced">Advanced</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Question Type Specific Panels */}
                            {exerciseForm.exerciseType === 'mcq' && (
                                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                                    <h4 className="text-xs font-bold uppercase text-amber-600 flex items-center gap-1.5">
                                        <CheckSquare className="w-4 h-4" /> MCQ Configuration
                                    </h4>
                                    <div>
                                        <label className="text-xs font-semibold">Code Snippet to Trace:</label>
                                        <textarea
                                            value={exerciseForm.mcqData.codeSnippet}
                                            onChange={e => setExerciseForm(f => ({
                                                ...f,
                                                mcqData: { ...f.mcqData, codeSnippet: e.target.value }
                                            }))}
                                            className="input h-20 font-mono text-xs mt-1"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold">Multiple Choice Options (Select Correct Choice):</label>
                                        {exerciseForm.mcqData.options.map((opt, oi) => (
                                            <div key={oi} className="flex items-center gap-2">
                                                <input
                                                    type="radio"
                                                    name="mcq_correct_option"
                                                    checked={exerciseForm.mcqData.correctOption === oi}
                                                    onChange={() => setExerciseForm(f => ({
                                                        ...f,
                                                        mcqData: { ...f.mcqData, correctOption: oi }
                                                    }))}
                                                />
                                                <input
                                                    type="text"
                                                    value={opt}
                                                    onChange={e => {
                                                        const nextOpts = [...exerciseForm.mcqData.options];
                                                        nextOpts[oi] = e.target.value;
                                                        setExerciseForm(f => ({
                                                            ...f,
                                                            mcqData: { ...f.mcqData, options: nextOpts }
                                                        }));
                                                    }}
                                                    className="input text-xs py-1 flex-1 font-mono"
                                                    placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {exerciseForm.exerciseType === 'fill_blank' && (
                                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                                    <h4 className="text-xs font-bold uppercase text-cyan-600 flex items-center gap-1.5">
                                        <FileText className="w-4 h-4" /> Syntax Cloze Configuration
                                    </h4>
                                    <div>
                                        <label className="text-xs font-semibold">Code Template with {"{{BLANK_1}}"} Tokens:</label>
                                        <textarea
                                            value={exerciseForm.clozeData.template}
                                            onChange={e => setExerciseForm(f => ({
                                                ...f,
                                                clozeData: { ...f.clozeData, template: e.target.value }
                                            }))}
                                            className="input h-20 font-mono text-xs mt-1"
                                        />
                                    </div>
                                </div>
                            )}

                            {exerciseForm.exerciseType === 'case_study' && (
                                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                                    <h4 className="text-xs font-bold uppercase text-purple-600 flex items-center gap-1.5">
                                        <BookOpen className="w-4 h-4" /> Real-World Case Study Scenario
                                    </h4>
                                    <div>
                                        <label className="text-xs font-semibold">Target Company / Engineering Architecture Context:</label>
                                        <input
                                            type="text"
                                            value={exerciseForm.caseStudyData.company}
                                            onChange={e => setExerciseForm(f => ({
                                                ...f,
                                                caseStudyData: { ...f.caseStudyData, company: e.target.value }
                                            }))}
                                            className="input text-xs mt-1"
                                            placeholder="e.g. Netflix Video Streaming Pipeline / AWS Cloudflare"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold">Production Scenario & Architectural Code:</label>
                                        <textarea
                                            value={exerciseForm.caseStudyData.scenarioCode}
                                            onChange={e => setExerciseForm(f => ({
                                                ...f,
                                                caseStudyData: { ...f.caseStudyData, scenarioCode: e.target.value }
                                            }))}
                                            className="input h-24 font-mono text-xs mt-1"
                                            placeholder="Production snippet with microservice architecture..."
                                        />
                                    </div>
                                </div>
                            )}

                            {/* CBSE Assertion & Reasoning Sub-Form */}
                            {exerciseForm.exerciseType === 'assertion_reason' && (
                                <div className="space-y-4 p-4 rounded-xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50/30 dark:bg-indigo-950/20">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
                                        ⚖️ CBSE Assertion-Reasoning Configuration
                                    </h4>
                                    <div>
                                        <label className="text-xs font-semibold block mb-1">Assertion Statement (A):</label>
                                        <textarea
                                            value={exerciseForm.arData.assertion}
                                            onChange={e => setExerciseForm(f => ({ ...f, arData: { ...f.arData, assertion: e.target.value } }))}
                                            className="input h-20 text-xs"
                                            placeholder="e.g., In Python, lists are mutable while tuples are immutable."
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold block mb-1">Reason Statement (R):</label>
                                        <textarea
                                            value={exerciseForm.arData.reason}
                                            onChange={e => setExerciseForm(f => ({ ...f, arData: { ...f.arData, reason: e.target.value } }))}
                                            className="input h-20 text-xs"
                                            placeholder="e.g., Tuple elements cannot be reassigned once created in memory."
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold block mb-1">Correct CBSE Assessment Option:</label>
                                        <select
                                            value={exerciseForm.arData.correctOption}
                                            onChange={e => setExerciseForm(f => ({ ...f, arData: { ...f.arData, correctOption: Number(e.target.value) } }))}
                                            className="input text-xs"
                                        >
                                            <option value={0}>(A) Both A and R are true, and R is correct explanation of A</option>
                                            <option value={1}>(B) Both A and R are true, but R is NOT correct explanation of A</option>
                                            <option value={2}>(C) A is true, but R is false</option>
                                            <option value={3}>(D) A is false, but R is true</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold block mb-1">Conceptual Explanation / Marking Guide:</label>
                                        <textarea
                                            value={exerciseForm.arData.explanation}
                                            onChange={e => setExerciseForm(f => ({ ...f, arData: { ...f.arData, explanation: e.target.value } }))}
                                            className="input h-16 text-xs"
                                            placeholder="Explain why this option is correct for the student review..."
                                        />
                                    </div>
                                </div>
                            )}

                            {/* CBSE Dry-Run Trace Table Sub-Form */}
                            {exerciseForm.exerciseType === 'code_trace' && (
                                <div className="space-y-4 p-4 rounded-xl border border-teal-200 dark:border-teal-900 bg-teal-50/30 dark:bg-teal-950/20">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400 flex items-center gap-1.5">
                                        🔍 CBSE Dry-Run Trace Table Configuration
                                    </h4>
                                    <div>
                                        <label className="text-xs font-semibold block mb-1">Code Snippet to Trace:</label>
                                        <textarea
                                            value={exerciseForm.traceData.codeSnippet}
                                            onChange={e => setExerciseForm(f => ({ ...f, traceData: { ...f.traceData, codeSnippet: e.target.value } }))}
                                            className="input h-24 font-mono text-xs"
                                            placeholder="a = 5&#10;for i in range(1, 4):&#10;    a = a + i"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold block mb-1">Table Headers (comma-separated):</label>
                                        <input
                                            type="text"
                                            value={exerciseForm.traceData.tableHeaders.join(', ')}
                                            onChange={e => setExerciseForm(f => ({
                                                ...f,
                                                traceData: {
                                                    ...f.traceData,
                                                    tableHeaders: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                                                }
                                            }))}
                                            className="input text-xs"
                                            placeholder="Iteration, a, i"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold block mb-1">Expected Dry-Run Step Rows (Row per line, values comma-separated):</label>
                                        <textarea
                                            value={exerciseForm.traceData.expectedRows.map(r => r.join(', ')).join('\n')}
                                            onChange={e => {
                                                const rows = e.target.value.split('\n').map(line => line.split(',').map(s => s.trim()));
                                                setExerciseForm(f => ({ ...f, traceData: { ...f.traceData, expectedRows: rows } }));
                                            }}
                                            className="input h-24 font-mono text-xs"
                                            placeholder="1, 6, 1&#10;2, 8, 2&#10;3, 11, 3"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold block mb-1">Tracing Walkthrough / Explanation:</label>
                                        <textarea
                                            value={exerciseForm.traceData.explanation}
                                            onChange={e => setExerciseForm(f => ({ ...f, traceData: { ...f.traceData, explanation: e.target.value } }))}
                                            className="input h-16 text-xs"
                                            placeholder="Step-by-step trace walkthrough..."
                                        />
                                    </div>
                                </div>
                            )}

                            {/* CBSE Error Spotting & Debugging Sub-Form */}
                            {exerciseForm.exerciseType === 'code_debug' && (
                                <div className="space-y-4 p-4 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50/30 dark:bg-rose-950/20">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                                        🐞 CBSE Error Spotting & Debugging Configuration
                                    </h4>
                                    <div>
                                        <label className="text-xs font-semibold block mb-1">Buggy Code Snippet (Shown to Student):</label>
                                        <textarea
                                            value={exerciseForm.debugData.buggyCode}
                                            onChange={e => setExerciseForm(f => ({ ...f, debugData: { ...f.debugData, buggyCode: e.target.value } }))}
                                            className="input h-24 font-mono text-xs"
                                            placeholder="def check(x):&#10;    if x > 0&#10;        return True"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-semibold block mb-1">Buggy Line #:</label>
                                            <input
                                                type="number"
                                                value={exerciseForm.debugData.errors[0]?.line || 1}
                                                onChange={e => {
                                                    const line = Number(e.target.value);
                                                    setExerciseForm(f => {
                                                        const errs = [...f.debugData.errors];
                                                        errs[0] = { ...errs[0], line };
                                                        return { ...f, debugData: { ...f.debugData, errors: errs } };
                                                    });
                                                }}
                                                className="input text-xs"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-semibold block mb-1">Corrected Line Code:</label>
                                            <input
                                                type="text"
                                                value={exerciseForm.debugData.errors[0]?.correctedLine || ''}
                                                onChange={e => {
                                                    const correctedLine = e.target.value;
                                                    setExerciseForm(f => {
                                                        const errs = [...f.debugData.errors];
                                                        errs[0] = { ...errs[0], correctedLine };
                                                        return { ...f, debugData: { ...f.debugData, errors: errs } };
                                                    });
                                                }}
                                                className="input font-mono text-xs"
                                                placeholder="    if x > 0:"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold block mb-1">Clean Reference Solution Code:</label>
                                        <textarea
                                            value={exerciseForm.debugData.solutionCode}
                                            onChange={e => setExerciseForm(f => ({ ...f, debugData: { ...f.debugData, solutionCode: e.target.value } }))}
                                            className="input h-24 font-mono text-xs"
                                            placeholder="def check(x):&#10;    if x > 0:&#10;        return True"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold block mb-1">CBSE Marking Scheme & Explanation:</label>
                                        <textarea
                                            value={exerciseForm.debugData.explanation}
                                            onChange={e => setExerciseForm(f => ({ ...f, debugData: { ...f.debugData, explanation: e.target.value } }))}
                                            className="input h-16 text-xs"
                                            placeholder="Missing colon syntax error on line 2..."
                                        />
                                    </div>
                                </div>
                            )}

                            {(exerciseForm.exerciseType === 'coding' || exerciseForm.exerciseType === 'bug_fix') && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="label">Starter Code Template</label>
                                            <textarea className="input h-24 font-mono text-xs" value={exerciseForm.starterCode}
                                                onChange={e => setExerciseForm(f => ({ ...f, starterCode: e.target.value }))}
                                                placeholder="def solution():\n    pass" />
                                        </div>
                                        <div>
                                            <label className="label">Reference Solution / Buggy Code</label>
                                            <textarea className="input h-24 font-mono text-xs" value={exerciseForm.solutionCode}
                                                onChange={e => setExerciseForm(f => ({ ...f, solutionCode: e.target.value }))}
                                                placeholder="def solution():\n    return True" />
                                        </div>
                                    </div>

                                    {/* Test Cases */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                                Test Cases ({exerciseForm.testCases.length})
                                            </label>
                                            <button
                                                type="button"
                                                onClick={handleAddTestCase}
                                                className="btn btn-secondary text-xs py-1 px-2.5 h-auto flex items-center gap-1"
                                            >
                                                <Plus className="w-3.5 h-3.5" /> Add Case
                                            </button>
                                        </div>

                                        <div className="space-y-2">
                                            {exerciseForm.testCases.map((tc, idx) => (
                                                <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Test Case #{idx + 1}</span>
                                                        <div className="flex items-center gap-3">
                                                            <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={tc.isHidden}
                                                                    onChange={e => handleTestCaseChange(idx, 'isHidden', e.target.checked)}
                                                                    className="checkbox checkbox-xs"
                                                                />
                                                                <span>Hidden</span>
                                                            </label>
                                                            {exerciseForm.testCases.length > 1 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleRemoveTestCase(idx)}
                                                                    className="text-red-500 hover:text-red-700 p-1"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div>
                                                            <span className="text-[10px] text-slate-500 uppercase font-semibold">Input (STDIN)</span>
                                                            <input
                                                                type="text"
                                                                value={tc.input}
                                                                onChange={e => handleTestCaseChange(idx, 'input', e.target.value)}
                                                                placeholder="e.g. 5\n10"
                                                                className="input text-xs font-mono py-1"
                                                            />
                                                        </div>
                                                        <div>
                                                            <span className="text-[10px] text-slate-500 uppercase font-semibold">Expected Output</span>
                                                            <input
                                                                type="text"
                                                                value={tc.expectedOutput}
                                                                onChange={e => handleTestCaseChange(idx, 'expectedOutput', e.target.value)}
                                                                placeholder="e.g. 15"
                                                                className="input text-xs font-mono py-1"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex gap-3 shrink-0">
                            <button onClick={() => { setShowExerciseModal(false); setEditingExerciseId(null); }} className="btn btn-secondary flex-1">Cancel</button>
                            <button onClick={handleSaveExercise} className="btn btn-primary flex-1">
                                {editingExerciseId ? 'Save Changes' : 'Deploy Exercise'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ====== UNIT MODAL ====== */}
            {showUnitModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full shadow-xl border border-slate-200 dark:border-slate-800">
                        <div className="p-5 border-b border-slate-100 dark:border-slate-800">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                {editingUnitId ? 'Edit Course Unit' : 'Course Unit Block'}
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">Each unit represents a topic or concept in the learning path</p>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="label">Unit Title *</label>
                                <input type="text" className="input" value={unitForm.title} onChange={e => setUnitForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g., Control Flow & Loops" />
                            </div>
                            <div>
                                <label className="label">Description / Summary</label>
                                <textarea
                                    className="input h-20 text-xs"
                                    value={unitForm.description || ''}
                                    onChange={e => setUnitForm(f => ({ ...f, description: e.target.value }))}
                                    placeholder="Overview of core concepts, objectives, and skills covered in this unit..."
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Sequence #</label>
                                    <input type="number" className="input" value={unitForm.unitNumber} disabled />
                                </div>
                                <div>
                                    <label className="label">Time (Hrs)</label>
                                    <input type="number" className="input" value={unitForm.expectedHours} onChange={e => setUnitForm(f => ({ ...f, expectedHours: parseInt(e.target.value) || 5 }))} />
                                </div>
                            </div>
                            <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-xl border border-emerald-100 dark:border-emerald-800">
                                <label className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400 mb-1 block flex items-center gap-1">
                                    <Unlock className="w-3 h-3" /> Mastery Unlock %
                                </label>
                                <input type="number" className="input border-white dark:border-slate-700" value={unitForm.unlockThreshold}
                                    onChange={e => setUnitForm(f => ({ ...f, unlockThreshold: parseInt(e.target.value) || 80 }))} />
                                <p className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 mt-1 leading-tight">
                                    💡 Research shows 80% is optimal — too low lets weak students skip ahead, too high causes frustration.
                                </p>
                            </div>
                        </div>
                        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex gap-3">
                            <button onClick={() => { setShowUnitModal(false); setEditingUnitId(null); }} className="btn btn-secondary flex-1">Cancel</button>
                            <button onClick={handleSaveUnit} className="btn btn-primary flex-1">
                                {editingUnitId ? 'Save Changes' : 'Save Block'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ====== ASSIGN TO CLASS/GROUP MODAL ====== */}
            {showAssignModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full shadow-xl border border-slate-200 dark:border-slate-800 max-h-[85vh] flex flex-col">
                        <div className="p-5 border-b border-slate-100 dark:border-slate-800 shrink-0">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Send className="w-5 h-5 text-primary-500" /> Assign Training to Students
                            </h3>
                            <p className="text-xs text-slate-500 mt-1">Select classes or groups to assign this training module. A deadline can be set to track completion.</p>
                        </div>
                        <div className="p-5 space-y-4 overflow-y-auto">
                            {/* Select Classes */}
                            <div>
                                <label className="label flex items-center gap-2">
                                    <Users className="w-4 h-4 text-primary-500" /> Assign to Classes
                                </label>
                                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                                    {classes.length === 0 ? (
                                        <p className="text-xs text-slate-400">No classes found. Create classes first.</p>
                                    ) : classes.map(cls => (
                                        <label key={cls.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition">
                                            <input type="checkbox" className="rounded border-slate-300"
                                                checked={selectedClasses.includes(cls.id)}
                                                onChange={e => {
                                                    if (e.target.checked) setSelectedClasses(p => [...p, cls.id]);
                                                    else setSelectedClasses(p => p.filter(c => c !== cls.id));
                                                }} />
                                            <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">{cls.name}</span>
                                            {cls._count?.enrollments != null && (
                                                <span className="text-[10px] text-slate-400 ml-auto">{cls._count.enrollments} students</span>
                                            )}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Deadline */}
                            <div>
                                <label className="label flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-amber-500" /> Deadline (Optional)
                                </label>
                                <input type="datetime-local" className="input"
                                    value={assignDeadline}
                                    onChange={e => setAssignDeadline(e.target.value)} />
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="label">Instructor Notes</label>
                                <textarea className="input h-16 text-sm" value={assignNotes}
                                    onChange={e => setAssignNotes(e.target.value)}
                                    placeholder="Optional: special instructions for students..." />
                            </div>

                            {/* Existing Assignments */}
                            {existingAssignments.length > 0 && (
                                <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Already Assigned To</h4>
                                    <div className="space-y-1.5">
                                        {existingAssignments.map(a => (
                                            <div key={a.id} className="flex items-center justify-between text-xs bg-slate-50 dark:bg-slate-800 rounded-lg p-2">
                                                <div className="flex flex-wrap gap-1">
                                                    {a.targets?.map((t, i) => (
                                                        <span key={i} className={`badge ${t.targetType === 'class' ? 'badge-primary' : 'badge-warning'}`}>
                                                            {t.className || t.groupName || t.targetType}
                                                        </span>
                                                    ))}
                                                </div>
                                                <span className="text-slate-400 shrink-0 ml-2">
                                                    {a.due_date ? `Due: ${formatDate(a.due_date)}` : 'No deadline'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex gap-3 shrink-0">
                            <button onClick={() => setShowAssignModal(false)} className="btn btn-secondary flex-1">Cancel</button>
                            <button
                                onClick={async () => {
                                    if (selectedClasses.length === 0 && selectedGroups.length === 0) {
                                        toast.error('Select at least one class or group');
                                        return;
                                    }
                                    try {
                                        await trainingAPI.assignModule(id, {
                                            classIds: selectedClasses,
                                            groupIds: selectedGroups,
                                            deadline: assignDeadline || undefined,
                                            notes: assignNotes || undefined,
                                        });
                                        toast.success('Module assigned to selected classes!');
                                        setShowAssignModal(false);
                                        setSelectedClasses([]);
                                        setSelectedGroups([]);
                                        setAssignDeadline('');
                                        setAssignNotes('');
                                        loadData();
                                    } catch (err) {
                                        toast.error(err.response?.data?.message || 'Failed to assign');
                                    }
                                }}
                                className="btn btn-primary flex-1"
                            >
                                <Send className="w-4 h-4" /> Assign Module
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ====== CONFIG MODAL ====== */}
            {showConfigModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full shadow-xl border border-slate-200 dark:border-slate-800 flex flex-col">
                        <div className="p-5 border-b border-slate-100 dark:border-slate-800">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Settings className="w-5 h-5 text-slate-500" /> Module Pedagogy Configuration
                            </h3>
                            <p className="text-xs text-slate-500 mt-1">Select which pedagogical techniques to enforce in this module's builder.</p>
                        </div>
                        <div className="p-5 space-y-4">
                            <label className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer">
                                <input type="checkbox" className="rounded text-primary-500 focus:ring-primary-500 shadow-sm w-4 h-4" 
                                    checked={configForm.useBlooms} onChange={e => setConfigForm(f => ({ ...f, useBlooms: e.target.checked }))} />
                                <div>
                                    <div className="font-semibold text-sm text-slate-900 dark:text-white">Bloom's Taxonomy Levels</div>
                                    <div className="text-xs text-slate-500 mt-0.5">Tag exercises with cognitive complexity.</div>
                                </div>
                            </label>

                            <label className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer">
                                <input type="checkbox" className="rounded text-primary-500 focus:ring-primary-500 shadow-sm w-4 h-4" 
                                    checked={configForm.useObjectives} onChange={e => setConfigForm(f => ({ ...f, useObjectives: e.target.checked }))} />
                                <div>
                                    <div className="font-semibold text-sm text-slate-900 dark:text-white">Specific Learning Objectives</div>
                                    <div className="text-xs text-slate-500 mt-0.5">Force designers to declare explicit outcome goals.</div>
                                </div>
                            </label>

                            <label className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer">
                                <input type="checkbox" className="rounded text-primary-500 focus:ring-primary-500 shadow-sm w-4 h-4" 
                                    checked={configForm.useTimeLimit} onChange={e => setConfigForm(f => ({ ...f, useTimeLimit: e.target.checked }))} />
                                <div>
                                    <div className="font-semibold text-sm text-slate-900 dark:text-white">Time-Boxed Practice</div>
                                    <div className="text-xs text-slate-500 mt-0.5">Add hard or soft time limits to practice exercises.</div>
                                </div>
                            </label>
                        </div>
                        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex gap-3 rounded-b-2xl">
                            <button onClick={() => setShowConfigModal(false)} className="btn btn-secondary flex-1">Cancel</button>
                            <button 
                                onClick={async () => {
                                    try {
                                        await trainingAPI.updatePedagogyConfig(id, configForm);
                                        setModuleData(prev => ({ ...prev, pedagogyConfig: configForm }));
                                        toast.success('Pedagogy configuration saved');
                                        setShowConfigModal(false);
                                    } catch {
                                        toast.error('Failed to save configuration');
                                    }
                                }} 
                                className="btn btn-primary flex-1"
                            >
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Unit Pre-Lab Theory & Mini-Checkpoints Modal */}
            {showTheoryModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-indigo-50/50 dark:bg-indigo-950/20">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-lg shadow-indigo-600/20">
                                    <BookOpen className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                        Pre-Lab Theory & Interactive Checkpoints
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        {theoryForm.title} • CBSE Concept Grounding
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowTheoryModal(false)}
                                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-600 transition"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto space-y-5 flex-1">
                            {/* Inline AI Theory Synthesizer Bar */}
                            <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-transparent p-4 rounded-2xl border border-indigo-200 dark:border-indigo-800/80 space-y-2.5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 dark:text-indigo-300">
                                        <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
                                        <span>AI Pre-Lab Notes & Checkpoints Synthesizer</span>
                                    </div>
                                    <span className="text-[10px] text-slate-500 font-medium">Auto-populates Markdown, Checkpoints & CBSE Tips</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={inlineAiTheoryPrompt}
                                        onChange={e => setInlineAiTheoryPrompt(e.target.value)}
                                        placeholder={`Enter unit concept or CBSE chapter (e.g. '${theoryForm.title || "Control Structures & Loop Invariants"}')...`}
                                        className="input text-xs flex-1 py-2 bg-white dark:bg-slate-900 border-indigo-200 dark:border-indigo-800"
                                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleInlineAiGenerateTheory(); } }}
                                    />
                                    <button
                                        type="button"
                                        disabled={inlineAiTheoryLoading}
                                        onClick={handleInlineAiGenerateTheory}
                                        className="btn bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2 px-4 rounded-xl shrink-0 flex items-center gap-1.5 shadow-md shadow-indigo-600/20 disabled:opacity-50 transition"
                                    >
                                        {inlineAiTheoryLoading ? (
                                            <>
                                                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                <span>Synthesizing...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="w-3.5 h-3.5" />
                                                <span>✨ Auto-Fill Theory</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1 block">
                                    Unit Concept Summary
                                </label>
                                <input
                                    type="text"
                                    value={theoryForm.summary}
                                    onChange={e => setTheoryForm(f => ({ ...f, summary: e.target.value }))}
                                    className="input text-xs"
                                    placeholder="Brief 1-2 sentence core concept takeaway..."
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1 block">
                                    Full Theory & Concept Markdown Notes
                                </label>
                                <textarea
                                    value={theoryForm.content}
                                    onChange={e => setTheoryForm(f => ({ ...f, content: e.target.value }))}
                                    className="input h-48 font-mono text-xs"
                                    placeholder="## 📘 Concept Heading&#10;&#10;Explain syntax, memory layout, and operational rules here..."
                                />
                            </div>

                            {/* Mini-Checkpoints Section */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                                        Interactive Mini-Checkpoints ({theoryForm.miniCheckpoints.length})
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setTheoryForm(f => ({
                                            ...f,
                                            miniCheckpoints: [
                                                ...f.miniCheckpoints,
                                                {
                                                    id: `cp_${Date.now()}`,
                                                    question: '',
                                                    codeSnippet: '',
                                                    options: ['', '', '', ''],
                                                    correctOption: 0,
                                                    explanation: ''
                                                }
                                            ]
                                        }))}
                                        className="btn btn-secondary text-xs py-1 px-2.5 rounded-lg flex items-center gap-1 font-semibold"
                                    >
                                        <Plus className="w-3.5 h-3.5" /> Add Mini-Checkpoint
                                    </button>
                                </div>

                                {theoryForm.miniCheckpoints.map((cp, cpIdx) => (
                                    <div key={cp.id || cpIdx} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                                                Mini-Checkpoint #{cpIdx + 1}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => setTheoryForm(f => ({
                                                    ...f,
                                                    miniCheckpoints: f.miniCheckpoints.filter((_, i) => i !== cpIdx)
                                                }))}
                                                className="text-rose-500 hover:text-rose-600 text-xs flex items-center gap-1"
                                            >
                                                <Trash2 className="w-3 h-3" /> Remove
                                            </button>
                                        </div>

                                        <input
                                            type="text"
                                            value={cp.question}
                                            onChange={e => {
                                                const val = e.target.value;
                                                setTheoryForm(f => {
                                                    const cps = [...f.miniCheckpoints];
                                                    cps[cpIdx] = { ...cps[cpIdx], question: val };
                                                    return { ...f, miniCheckpoints: cps };
                                                });
                                            }}
                                            placeholder="Question prompt..."
                                            className="input text-xs"
                                        />

                                        <textarea
                                            value={cp.codeSnippet || ''}
                                            onChange={e => {
                                                const val = e.target.value;
                                                setTheoryForm(f => {
                                                    const cps = [...f.miniCheckpoints];
                                                    cps[cpIdx] = { ...cps[cpIdx], codeSnippet: val };
                                                    return { ...f, miniCheckpoints: cps };
                                                });
                                            }}
                                            placeholder="Optional code snippet..."
                                            className="input h-16 font-mono text-xs"
                                        />

                                        <div className="grid grid-cols-2 gap-2">
                                            {(cp.options || ['', '', '', '']).map((opt, oIdx) => (
                                                <div key={oIdx} className="flex items-center gap-2">
                                                    <input
                                                        type="radio"
                                                        name={`correct_${cp.id || cpIdx}`}
                                                        checked={cp.correctOption === oIdx}
                                                        onChange={() => {
                                                            setTheoryForm(f => {
                                                                const cps = [...f.miniCheckpoints];
                                                                cps[cpIdx] = { ...cps[cpIdx], correctOption: oIdx };
                                                                return { ...f, miniCheckpoints: cps };
                                                            });
                                                        }}
                                                        className="accent-indigo-600 shrink-0"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={opt}
                                                        onChange={e => {
                                                            const val = e.target.value;
                                                            setTheoryForm(f => {
                                                                const cps = [...f.miniCheckpoints];
                                                                const opts = [...(cps[cpIdx].options || [])];
                                                                opts[oIdx] = val;
                                                                cps[cpIdx] = { ...cps[cpIdx], options: opts };
                                                                return { ...f, miniCheckpoints: cps };
                                                            });
                                                        }}
                                                        placeholder={`Option ${String.fromCharCode(65 + oIdx)}`}
                                                        className="input text-xs py-1"
                                                    />
                                                </div>
                                            ))}
                                        </div>

                                        <input
                                            type="text"
                                            value={cp.explanation || ''}
                                            onChange={e => {
                                                const val = e.target.value;
                                                setTheoryForm(f => {
                                                    const cps = [...f.miniCheckpoints];
                                                    cps[cpIdx] = { ...cps[cpIdx], explanation: val };
                                                    return { ...f, miniCheckpoints: cps };
                                                });
                                            }}
                                            placeholder="Explanation for students after answering..."
                                            className="input text-xs"
                                        />
                                    </div>
                                ))}
                            </div>

                            {/* CBSE Tips Section */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                                        CBSE Exam Tips & Pitfalls ({theoryForm.cbseTips.length})
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setTheoryForm(f => ({ ...f, cbseTips: [...f.cbseTips, ''] }))}
                                        className="btn btn-secondary text-xs py-1 px-2.5 rounded-lg flex items-center gap-1 font-semibold"
                                    >
                                        <Plus className="w-3.5 h-3.5" /> Add CBSE Tip
                                    </button>
                                </div>
                                {theoryForm.cbseTips.map((tip, tIdx) => (
                                    <div key={tIdx} className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={tip}
                                            onChange={e => {
                                                const val = e.target.value;
                                                setTheoryForm(f => {
                                                    const tips = [...f.cbseTips];
                                                    tips[tIdx] = val;
                                                    return { ...f, cbseTips: tips };
                                                });
                                            }}
                                            placeholder="e.g., Common exam trap: mutable default arguments in Python"
                                            className="input text-xs py-1.5 flex-1"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setTheoryForm(f => ({ ...f, cbseTips: f.cbseTips.filter((_, i) => i !== tIdx) }))}
                                            className="text-rose-500 hover:text-rose-600 p-1.5"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setShowTheoryModal(false)}
                                className="btn btn-secondary text-xs py-2 px-4 rounded-xl"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveTheory}
                                className="btn bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2 px-5 rounded-xl shadow-md shadow-indigo-600/20"
                            >
                                Save Theory & Checkpoints
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Course Meta Modal */}
            {showEditModuleModal && (
                <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                                <Edit3 className="w-4 h-4 text-indigo-500" /> Edit Course Metadata & Settings
                            </h3>
                            <button onClick={() => setShowEditModuleModal(false)} className="p-1.5 text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSaveModuleMeta} className="p-6 space-y-4">
                            <div>
                                <label className="label">Course Title *</label>
                                <input
                                    type="text"
                                    required
                                    value={moduleEditForm.title}
                                    onChange={e => setModuleEditForm(f => ({ ...f, title: e.target.value }))}
                                    className="input font-bold"
                                    placeholder="e.g. Python Data Structures & Algorithms"
                                />
                            </div>
                            <div>
                                <label className="label">Hindi Title (Optional)</label>
                                <input
                                    type="text"
                                    value={moduleEditForm.titleHindi}
                                    onChange={e => setModuleEditForm(f => ({ ...f, titleHindi: e.target.value }))}
                                    className="input"
                                    placeholder="e.g. पायथन डेटा संरचना और एल्गोरिदम"
                                />
                            </div>
                            <div>
                                <label className="label">Course Description</label>
                                <textarea
                                    value={moduleEditForm.description}
                                    onChange={e => setModuleEditForm(f => ({ ...f, description: e.target.value }))}
                                    className="input h-20 text-xs"
                                    placeholder="Course objectives, prerequisites and scope..."
                                />
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="label">Language</label>
                                    <select
                                        value={moduleEditForm.language}
                                        onChange={e => setModuleEditForm(f => ({ ...f, language: e.target.value }))}
                                        className="input text-xs"
                                    >
                                        <option value="python">Python</option>
                                        <option value="javascript">JavaScript</option>
                                        <option value="cpp">C++</option>
                                        <option value="java">Java</option>
                                        <option value="sql">SQL</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="label">Board</label>
                                    <select
                                        value={moduleEditForm.boardAligned}
                                        onChange={e => setModuleEditForm(f => ({ ...f, boardAligned: e.target.value }))}
                                        className="input text-xs"
                                    >
                                        <option value="CBSE">CBSE</option>
                                        <option value="PSEB">PSEB</option>
                                        <option value="ICSE">ICSE</option>
                                        <option value="Custom">Custom</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="label">Class Level</label>
                                    <select
                                        value={moduleEditForm.classLevel}
                                        onChange={e => setModuleEditForm(f => ({ ...f, classLevel: Number(e.target.value) }))}
                                        className="input text-xs"
                                    >
                                        <option value={11}>Class 11</option>
                                        <option value={12}>Class 12</option>
                                        <option value={10}>Class 10</option>
                                        <option value={9}>Class 9</option>
                                    </select>
                                </div>
                            </div>
                            <div className="pt-2 flex justify-end gap-2">
                                <button type="button" onClick={() => setShowEditModuleModal(false)} className="btn btn-secondary text-xs">
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary text-xs font-bold">
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* AI LMS Writing & Graphics Copilot */}
            <AiTrainingCopilot
                isOpen={showAiCopilot}
                onClose={() => setShowAiCopilot(false)}
                activeTab={aiCopilotTab}
                onInsertOutline={handleApplyAiOutline}
                onInsertTheory={handleApplyAiTheory}
                onInsertExercise={handleApplyAiExercise}
                context={{
                    language: moduleData?.language || 'python',
                    classLevel: moduleData?.classLevel || 11,
                    board: moduleData?.boardAligned || 'PSEB',
                    unitTitle: moduleData?.units?.find(u => u.id === activeUnitId)?.title || '',
                    unitDescription: moduleData?.units?.find(u => u.id === activeUnitId)?.description || '',
                    moduleTitle: moduleData?.title || '',
                    topic: exerciseForm.title || moduleData?.units?.find(u => u.id === activeUnitId)?.title || moduleData?.title || '',
                    exerciseType: exerciseForm.exerciseType,
                    difficulty: exerciseForm.difficulty,
                    scaffoldLevel: exerciseForm.scaffoldLevel,
                    bloomsLevel: exerciseForm.bloomsLevel
                }}
            />
        </div>
    );
}
