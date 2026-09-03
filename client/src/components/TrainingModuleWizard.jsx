'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    Sparkles, BookOpen, Layers, Code2, CheckCircle2,
    ArrowRight, ArrowLeft, Plus, Trash2, Edit3, ShieldAlert,
    Clock, Award, Lock, Send, Users, Calendar, Trophy,
    AlertTriangle, X, Check, HelpCircle, Eye, EyeOff, CheckSquare, FileText
} from 'lucide-react';
import api, { trainingAPI, classesAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import AiTrainingCopilot from './AiTrainingCopilot';

const STEP_TITLES = [
    { step: 1, title: 'Blueprint & Meta', desc: 'Title, Language & Board' },
    { step: 2, title: 'Units & Mastery', desc: 'Curriculum & Gate Thresholds' },
    { step: 3, title: 'Exercise Arena', desc: 'Coding, MCQs, Cloze & Labs' },
    { step: 4, title: 'Pedagogy Rules', desc: 'Bloom\'s & Gamification' },
    { step: 5, title: 'Deploy & Assign', desc: 'Classes & Publishing' }
];

export default function TrainingModuleWizard({
    isOpen,
    onClose,
    onSuccess,
    initialData = null,
    availableClasses = []
}) {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showAiCopilot, setShowAiCopilot] = useState(false);
    const [aiCopilotTab, setAiCopilotTab] = useState('outline');

    // Step 1 Form: Module Meta
    const [moduleForm, setModuleForm] = useState({
        title: initialData?.title || '',
        titleHindi: initialData?.titleHindi || '',
        description: initialData?.description || '',
        language: initialData?.language || 'python',
        boardAligned: initialData?.boardAligned || 'PSEB',
        classLevel: initialData?.classLevel || 11,
        isPublished: initialData?.isPublished || false,
        pedagogyConfig: initialData?.pedagogyConfig || {
            useBlooms: true,
            useObjectives: true,
            useTimeLimit: false
        }
    });

    // Step 2 Form: Units Array
    const [units, setUnits] = useState(initialData?.units || [
        {
            id: 'temp_unit_1',
            unitNumber: 1,
            title: 'Unit 1: Fundamentals & Core Syntax',
            description: 'Foundational syntax, variables, and elementary data types.',
            expectedHours: 4,
            unlockThreshold: 80,
            exercises: []
        }
    ]);

    // Active unit selected in Step 3
    const [selectedUnitIdx, setSelectedUnitIdx] = useState(0);

    // Exercise creation in Step 3
    const [showExerciseFormModal, setShowExerciseFormModal] = useState(false);
    const [editingExerciseIdx, setEditingExerciseIdx] = useState(null);
    const [exerciseForm, setExerciseForm] = useState({
        title: '',
        description: '',
        theory: '',
        exerciseType: 'coding', // 'coding' | 'mcq' | 'fill_blank' | 'bug_fix' | 'case_study'
        difficulty: 'beginner',
        scaffoldLevel: 'guided',
        bloomsLevel: 'apply',
        learningObjective: '',
        isReviewExercise: false,
        xpReward: 15,
        timeLimit: 5,
        starterCode: '# Write code here\n',
        solutionCode: '# Solution\n',
        testCases: [
            { input: '5', expectedOutput: '10', isHidden: false },
            { input: '0', expectedOutput: '0', isHidden: true }
        ],
        hints: ['Check your base case.'],
        mcqData: {
            question: 'What is the output of this code snippet?',
            codeSnippet: 'print("Hello World")',
            options: ['Hello World', 'None', 'SyntaxError', 'undefined'],
            correctOption: 0,
            explanation: 'The print function writes the string to standard output.'
        },
        clozeData: {
            instruction: 'Fill in the blanks to complete the code:',
            template: 'for i in {{BLANK_1}}(5):\n    print(i)',
            blanks: [{ id: 'BLANK_1', correctAnswer: 'range', hint: 'Sequence generator function' }],
            explanation: 'range(5) produces numbers from 0 to 4.'
        },
        caseStudyData: {
            company: 'TechCorp Cloud Team',
            incident: 'High latency observed during peak checkout hours.',
            scenarioCode: '# Inefficient lookup\ndef lookup(items, target):\n    return [x for x in items if x == target]',
            questions: [
                {
                    id: 'q1',
                    prompt: 'What data structure would optimize this lookup from O(N) to O(1)?',
                    options: ['Hash Set / Dictionary', 'Linked List', 'Array', 'Stack'],
                    correctOption: 0,
                    explanation: 'A Hash Set provides O(1) average-time complexity lookups.'
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

    // Wizard Unit Pre-Lab Theory Modal State
    const [showWizardTheoryModal, setShowWizardTheoryModal] = useState(false);
    const [wizardTheoryUnitIdx, setWizardTheoryUnitIdx] = useState(null);
    const [wizardTheoryForm, setWizardTheoryForm] = useState({
        title: '',
        summary: '',
        content: '',
        miniCheckpoints: [],
        cbseTips: []
    });

    // Inline AI Generation State for Wizard Exercise Modal
    const [wizardInlineAiPrompt, setWizardInlineAiPrompt] = useState('');
    const [wizardInlineAiProvider, setWizardInlineAiProvider] = useState('groq');
    const [wizardInlineAiLoading, setWizardInlineAiLoading] = useState(false);

    // Inline AI Generation State for Wizard Theory Modal
    const [wizardInlineAiTheoryPrompt, setWizardInlineAiTheoryPrompt] = useState('');
    const [wizardInlineAiTheoryLoading, setWizardInlineAiTheoryLoading] = useState(false);

    // Step 5 Form: Class Allocations
    const [targetClasses, setTargetClasses] = useState([]);
    const [deadline, setDeadline] = useState('');
    const [specialNotes, setSpecialNotes] = useState('');

    // Auto-Save & Local Draft State
    const [lastSavedTime, setLastSavedTime] = useState(null);
    const [hasSavedDraft, setHasSavedDraft] = useState(false);

    // Check for existing unsaved draft on mount
    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            const saved = localStorage.getItem('ulrms_training_wizard_draft');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed && (parsed.moduleForm?.title || (parsed.units?.length > 1) || parsed.units?.[0]?.exercises?.length > 0)) {
                    setHasSavedDraft(true);
                }
            }
        } catch (e) {
            console.error('Error reading draft:', e);
        }
    }, []);

    // Debounced Auto-Save
    useEffect(() => {
        if (typeof window === 'undefined' || !isOpen) return;
        const timer = setTimeout(() => {
            try {
                if (moduleForm.title || units.length > 1 || (units[0]?.exercises && units[0].exercises.length > 0)) {
                    localStorage.setItem('ulrms_training_wizard_draft', JSON.stringify({
                        moduleForm,
                        units,
                        currentStep,
                        targetClasses,
                        timestamp: Date.now()
                    }));
                    setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
                }
            } catch (e) {
                console.warn('Auto-save failed:', e);
            }
        }, 1000);
        return () => clearTimeout(timer);
    }, [moduleForm, units, currentStep, targetClasses, isOpen]);

    const handleRestoreDraft = () => {
        try {
            const saved = localStorage.getItem('ulrms_training_wizard_draft');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.moduleForm) setModuleForm(parsed.moduleForm);
                if (parsed.units) setUnits(parsed.units);
                if (parsed.currentStep) setCurrentStep(parsed.currentStep);
                if (parsed.targetClasses) setTargetClasses(parsed.targetClasses);
                setHasSavedDraft(false);
                toast.success('💾 Restored course draft from cache!');
            }
        } catch (e) {
            toast.error('Failed to restore draft');
        }
    };

    const handleDiscardDraft = () => {
        localStorage.removeItem('ulrms_training_wizard_draft');
        setHasSavedDraft(false);
        toast.success('Draft cache discarded.');
    };

    // Pedagogy Score Calculation
    const pedagogyStats = useMemo(() => {
        let score = 0;
        const totalExercises = units.reduce((acc, u) => acc + (u.exercises?.length || 0), 0);
        const allExercises = units.flatMap(u => u.exercises || []);

        // Units configured
        if (units.length >= 2) score += 20;
        else if (units.length >= 1) score += 10;

        // Mastery gates
        if (units.every(u => u.unlockThreshold >= 70)) score += 20;

        // Exercise scaffolding diversity
        const scaffolds = new Set(allExercises.map(e => e.scaffoldLevel));
        if (scaffolds.size >= 3) score += 20;
        else if (scaffolds.size >= 1) score += 10;

        // Question types diversity
        const types = new Set(allExercises.map(e => e.exerciseType));
        if (types.size >= 3) score += 20;
        else if (types.size >= 1) score += 10;

        // Spaced repetition & hidden tests
        const hasReview = allExercises.some(e => e.isReviewExercise);
        const hasHidden = allExercises.some(e => {
            if (Array.isArray(e.testCases)) return e.testCases.some(t => t.isHidden);
            return false;
        });
        if (hasReview) score += 10;
        if (hasHidden) score += 10;

        return {
            score: Math.min(score, 100),
            totalExercises,
            totalUnits: units.length
        };
    }, [units]);

    // Handlers for Units
    const handleAddUnit = () => {
        const nextNum = units.length + 1;
        setUnits(prev => [
            ...prev,
            {
                id: `temp_unit_${Date.now()}`,
                unitNumber: nextNum,
                title: `Unit ${nextNum}: New Topic`,
                description: 'Topic description and learning milestones.',
                expectedHours: 4,
                unlockThreshold: 80,
                exercises: []
            }
        ]);
        setSelectedUnitIdx(units.length);
    };

    const handleRemoveUnit = (idx) => {
        if (units.length <= 1) {
            toast.error('Module must have at least 1 unit');
            return;
        }
        setUnits(prev => {
            const updated = prev.filter((_, i) => i !== idx).map((u, i) => ({ ...u, unitNumber: i + 1 }));
            return updated;
        });
        if (selectedUnitIdx >= units.length - 1) {
            setSelectedUnitIdx(Math.max(0, units.length - 2));
        }
    };

    const handleUpdateUnit = (idx, field, value) => {
        setUnits(prev => prev.map((u, i) => i === idx ? { ...u, [field]: value } : u));
    };

    // Unit Pre-Lab Theory Handlers
    const handleOpenWizardTheory = (uIdx) => {
        const u = units[uIdx];
        if (!u) return;
        setWizardTheoryUnitIdx(uIdx);
        setWizardTheoryForm({
            title: u.title || `Unit ${uIdx + 1}`,
            summary: u.theoryData?.summary || u.description || '',
            content: u.theoryData?.content || u.theory || '',
            miniCheckpoints: Array.isArray(u.theoryData?.miniCheckpoints) ? u.theoryData.miniCheckpoints : [],
            cbseTips: Array.isArray(u.theoryData?.cbseTips) ? u.theoryData.cbseTips : []
        });
        setShowWizardTheoryModal(true);
    };

    const handleSaveWizardTheory = () => {
        if (wizardTheoryUnitIdx === null) return;
        setUnits(prev => prev.map((u, i) => {
            if (i !== wizardTheoryUnitIdx) return u;
            return {
                ...u,
                theoryData: {
                    summary: wizardTheoryForm.summary,
                    content: wizardTheoryForm.content,
                    miniCheckpoints: wizardTheoryForm.miniCheckpoints,
                    cbseTips: wizardTheoryForm.cbseTips
                }
            };
        }));
        setShowWizardTheoryModal(false);
        setWizardTheoryUnitIdx(null);
        toast.success('📖 Unit Pre-Lab Theory & Checkpoints saved!');
    };

    const handleInlineAiGenerateTheoryInWizard = async () => {
        const topicToUse = wizardInlineAiTheoryPrompt.trim() || wizardTheoryForm.title || moduleForm.title || 'Unit Theory';
        setWizardInlineAiTheoryLoading(true);
        try {
            const res = await api.post('/training/ai/theory', {
                topic: topicToUse,
                unitTitle: wizardTheoryForm.title,
                language: moduleForm.language || 'python',
                classLevel: moduleForm.classLevel || 11,
                board: moduleForm.boardAligned || 'CBSE',
                provider: 'groq'
            });
            if (res.data.success && res.data.data.theory) {
                const t = res.data.data.theory;
                setWizardTheoryForm(prev => ({
                    ...prev,
                    summary: t.summary || prev.summary || `Core concepts of ${wizardTheoryForm.title}`,
                    content: t.contentMarkdown || t.theoryMarkdown || t.content || prev.content,
                    miniCheckpoints: Array.isArray(t.miniCheckpoints) && t.miniCheckpoints.length > 0 ? t.miniCheckpoints : prev.miniCheckpoints,
                    cbseTips: Array.isArray(t.cbseTips) && t.cbseTips.length > 0 ? t.cbseTips : prev.cbseTips
                }));
                toast.success('✨ Pre-Lab notes & checkpoints generated into form!');
            } else {
                toast.error('AI did not return theory content');
            }
        } catch (err) {
            console.error('Wizard AI Theory error:', err);
            toast.error(err.response?.data?.message || 'Failed to synthesize theory');
        } finally {
            setWizardInlineAiTheoryLoading(false);
        }
    };

    const handleInlineAiGenerateExerciseInWizard = async () => {
        if (!wizardInlineAiPrompt.trim()) return;
        setWizardInlineAiLoading(true);
        try {
            const activeUnit = units[selectedUnitIdx];
            const res = await api.post('/training/ai/exercise', {
                prompt: wizardInlineAiPrompt,
                exerciseType: exerciseForm.exerciseType,
                difficulty: exerciseForm.difficulty || 'beginner',
                scaffoldLevel: exerciseForm.scaffoldLevel || 'guided',
                bloomsLevel: exerciseForm.bloomsLevel || 'apply',
                language: moduleForm.language || 'python',
                classLevel: moduleForm.classLevel || 11,
                board: moduleForm.boardAligned || 'CBSE',
                unitTitle: activeUnit?.title || '',
                provider: wizardInlineAiProvider
            });
            if (res.data.success && res.data.data.exercise) {
                const ex = res.data.data.exercise;
                handleApplyAiExercise(ex);
                toast.success(`✨ Challenge for "${ex.title}" auto-filled into form!`);
            } else {
                toast.error('AI did not return an exercise');
            }
        } catch (err) {
            console.error('Wizard AI Exercise error:', err);
            toast.error(err.response?.data?.message || 'Failed to synthesize exercise');
        } finally {
            setWizardInlineAiLoading(false);
        }
    };

    // Handlers for Exercises
    const handleSaveExercise = () => {
        if (!exerciseForm.title.trim()) {
            toast.error('Problem title is required');
            return;
        }

        const activeUnit = units[selectedUnitIdx];
        if (!activeUnit) return;

        let processedTestCases = exerciseForm.testCases;
        let processedStarterCode = exerciseForm.starterCode;
        let processedSolutionCode = exerciseForm.solutionCode;

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
            processedStarterCode = exerciseForm.debugData?.buggyCode || exerciseForm.starterCode;
            processedSolutionCode = exerciseForm.debugData?.solutionCode || exerciseForm.solutionCode;
        }

        const newEx = {
            id: editingExerciseIdx !== null ? activeUnit.exercises[editingExerciseIdx].id : `temp_ex_${Date.now()}`,
            title: exerciseForm.title,
            description: exerciseForm.description,
            theory: exerciseForm.theory,
            exerciseType: exerciseForm.exerciseType,
            difficulty: exerciseForm.difficulty,
            scaffoldLevel: exerciseForm.scaffoldLevel,
            bloomsLevel: exerciseForm.bloomsLevel,
            learningObjective: exerciseForm.learningObjective,
            isReviewExercise: exerciseForm.isReviewExercise,
            xpReward: Number(exerciseForm.xpReward) || 15,
            timeLimit: Number(exerciseForm.timeLimit) || 5,
            starterCode: processedStarterCode,
            solutionCode: processedSolutionCode,
            testCases: processedTestCases,
            hints: exerciseForm.hints,
            arData: exerciseForm.arData,
            traceData: exerciseForm.traceData,
            debugData: exerciseForm.debugData
        };

        setUnits(prev => prev.map((u, i) => {
            if (i !== selectedUnitIdx) return u;
            const updatedExercises = [...(u.exercises || [])];
            if (editingExerciseIdx !== null) {
                updatedExercises[editingExerciseIdx] = newEx;
            } else {
                updatedExercises.push(newEx);
            }
            return { ...u, exercises: updatedExercises };
        }));

        setShowExerciseFormModal(false);
        setEditingExerciseIdx(null);
        toast.success(editingExerciseIdx !== null ? 'Exercise updated!' : 'Exercise added to Unit!');
    };

    const handleRemoveExercise = (exIdx) => {
        setUnits(prev => prev.map((u, i) => {
            if (i !== selectedUnitIdx) return u;
            return { ...u, exercises: u.exercises.filter((_, idx) => idx !== exIdx) };
        }));
    };

    // AI Copilot Integration Callbacks
    const handleApplyAiOutline = (aiOutline) => {
        if (!aiOutline) return;
        setModuleForm(prev => ({
            ...prev,
            title: aiOutline.title || prev.title,
            titleHindi: aiOutline.titleHindi || prev.titleHindi,
            description: aiOutline.description || prev.description,
            language: aiOutline.language || prev.language,
            boardAligned: aiOutline.boardAligned || prev.boardAligned,
            classLevel: aiOutline.classLevel || prev.classLevel,
            pedagogyConfig: aiOutline.pedagogyConfig || prev.pedagogyConfig
        }));

        if (aiOutline.units && Array.isArray(aiOutline.units) && aiOutline.units.length > 0) {
            setUnits(aiOutline.units.map((u, i) => ({
                id: `ai_unit_${i + 1}_${Date.now()}_${Math.random()}`,
                unitNumber: u.unitNumber || i + 1,
                title: u.title,
                description: u.description,
                expectedHours: u.expectedHours || 4,
                unlockThreshold: u.unlockThreshold || 80,
                theoryData: {
                    summary: u.description || `Core concepts for ${u.title}`,
                    content: u.theory || (Array.isArray(u.keyConcepts) ? `## Key Concepts\n\n${u.keyConcepts.map(c => `- ${c}`).join('\n')}` : ''),
                    miniCheckpoints: Array.isArray(u.miniCheckpoints) ? u.miniCheckpoints : [],
                    cbseTips: Array.isArray(u.cbseTips) ? u.cbseTips : []
                },
                exercises: (u.exercises || []).map((ex, eIdx) => ({
                    id: `ai_ex_${eIdx + 1}_${Date.now()}_${Math.random()}`,
                    title: ex.title,
                    description: ex.description,
                    theory: ex.theory || '',
                    exerciseType: ex.exerciseType || 'coding',
                    difficulty: ex.difficulty || 'beginner',
                    scaffoldLevel: ex.scaffoldLevel || 'guided',
                    bloomsLevel: ex.bloomsLevel || 'apply',
                    learningObjective: ex.learningObjective || '',
                    xpReward: ex.xpReward || 15,
                    timeLimit: ex.timeLimit || 5,
                    isReviewExercise: ex.isReviewExercise || false,
                    starterCode: ex.starterCode || (ex.testCases?.template ? ex.testCases.template : ''),
                    solutionCode: ex.solutionCode || '',
                    testCases: Array.isArray(ex.testCases) ? ex.testCases : [],
                    hints: ex.hints || [],
                    mcqData: ex.exerciseType === 'mcq' && typeof ex.testCases === 'object' ? ex.testCases : null,
                    clozeData: ex.exerciseType === 'fill_blank' && typeof ex.testCases === 'object' ? ex.testCases : null,
                    caseStudyData: ex.exerciseType === 'case_study' && typeof ex.testCases === 'object' ? ex.testCases : null,
                    arData: ex.exerciseType === 'assertion_reason' && typeof ex.testCases === 'object' ? ex.testCases : null,
                    traceData: ex.exerciseType === 'code_trace' && typeof ex.testCases === 'object' ? ex.testCases : null,
                    debugData: ex.exerciseType === 'code_debug' && typeof ex.testCases === 'object' ? ex.testCases : null
                }))
            })));
            setSelectedUnitIdx(0);
        }
    };

    const handleApplyAiExercise = (aiEx) => {
        if (!aiEx) return;
        const currentType = aiEx.exerciseType || 'coding';
        setExerciseForm(prev => ({
            ...prev,
            title: aiEx.title || '',
            description: aiEx.description || '',
            theory: aiEx.theory || '',
            exerciseType: currentType,
            difficulty: aiEx.difficulty || 'beginner',
            scaffoldLevel: aiEx.scaffoldLevel || 'guided',
            bloomsLevel: aiEx.bloomsLevel || 'apply',
            learningObjective: aiEx.learningObjective || '',
            xpReward: aiEx.xpReward || 15,
            timeLimit: aiEx.timeLimit || 5,
            isReviewExercise: aiEx.isReviewExercise || false,
            starterCode: aiEx.starterCode || (currentType === 'fill_blank' && aiEx.testCases?.template ? aiEx.testCases.template : ''),
            solutionCode: aiEx.solutionCode || '',
            testCases: Array.isArray(aiEx.testCases) ? aiEx.testCases : prev.testCases,
            hints: aiEx.hints || prev.hints,
            mcqData: currentType === 'mcq' && typeof aiEx.testCases === 'object' ? aiEx.testCases : prev.mcqData,
            clozeData: currentType === 'fill_blank' && typeof aiEx.testCases === 'object' ? aiEx.testCases : prev.clozeData,
            caseStudyData: currentType === 'case_study' && typeof aiEx.testCases === 'object' ? aiEx.testCases : prev.caseStudyData,
            arData: currentType === 'assertion_reason' && typeof aiEx.testCases === 'object' ? aiEx.testCases : prev.arData,
            traceData: currentType === 'code_trace' && typeof aiEx.testCases === 'object' ? aiEx.testCases : prev.traceData,
            debugData: currentType === 'code_debug' && typeof aiEx.testCases === 'object' ? aiEx.testCases : prev.debugData
        }));
        setShowExerciseFormModal(true);
    };

    // Final Create & Deploy Handler
    const handleFinalDeploy = async (shouldPublishNow = false) => {
        if (!moduleForm.title.trim()) {
            toast.error('Module Title is required');
            setCurrentStep(1);
            return;
        }

        setIsSubmitting(true);
        try {
            // 1. Create or Update Module
            const createPayload = {
                ...moduleForm,
                isPublished: shouldPublishNow || moduleForm.isPublished,
                totalUnits: units.length,
                totalExercises: pedagogyStats.totalExercises
            };

            let moduleId = initialData?.id;
            if (moduleId) {
                await trainingAPI.updateModule(moduleId, createPayload);
            } else {
                const modRes = await trainingAPI.createModule(createPayload);
                const createdModule = modRes.data.data.module;
                moduleId = createdModule.id;
            }

            // 2. Create / Update Units & Exercises in order
            for (let uIdx = 0; uIdx < units.length; uIdx++) {
                const u = units[uIdx];
                let createdUnitId = u.id && !String(u.id).startsWith('temp_') && !String(u.id).startsWith('ai_') ? u.id : null;

                if (!createdUnitId) {
                    const unitRes = await trainingAPI.createUnit(moduleId, {
                        unitNumber: uIdx + 1,
                        title: u.title,
                        description: u.description,
                        expectedHours: Number(u.expectedHours) || 4,
                        unlockThreshold: Number(u.unlockThreshold) || 80,
                        sequenceOrder: uIdx
                    });
                    createdUnitId = unitRes.data.data.unit.id;
                } else {
                    await trainingAPI.updateUnit(createdUnitId, {
                        unitNumber: uIdx + 1,
                        title: u.title,
                        description: u.description,
                        expectedHours: Number(u.expectedHours) || 4,
                        unlockThreshold: Number(u.unlockThreshold) || 80,
                        sequenceOrder: uIdx
                    });
                }

                // Save Pre-Lab Theory & Checkpoints if available
                if (u.theoryData) {
                    try {
                        await trainingAPI.updateUnitTheory(createdUnitId, u.theoryData);
                    } catch (tErr) {
                        console.warn('Could not save unit theory:', tErr.message);
                    }
                }

                // Create Exercises for this unit
                if (u.exercises && u.exercises.length > 0) {
                    for (let eIdx = 0; eIdx < u.exercises.length; eIdx++) {
                        const ex = u.exercises[eIdx];
                        const fullDescription = ex.theory
                            ? `## 📖 Learning Content\n\n${ex.theory}\n\n---\n\n## 🎯 Problem Statement\n\n${ex.description}`
                            : ex.description;

                        await trainingAPI.createExercise(createdUnitId, {
                            title: ex.title,
                            description: fullDescription,
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

            // 3. Assign to Classes if selected
            if (targetClasses.length > 0) {
                try {
                    await trainingAPI.assignModule(moduleId, {
                        classIds: targetClasses,
                        deadline: deadline || undefined,
                        notes: specialNotes || undefined
                    });
                } catch (assignErr) {
                    console.warn('Class allocation warning:', assignErr.message);
                }
            }

            toast.success('🎉 Training Module Created Successfully!');
            localStorage.removeItem('ulrms_training_wizard_draft');
            if (onSuccess) onSuccess(createdModule);
            onClose();
            router.push(`/admin/training/${moduleId}/builder`);
        } catch (err) {
            console.error('Module creation error:', err);
            toast.error(err.response?.data?.message || 'Failed to create training module');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-5xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden">
                
                {/* Top Stepper Bar */}
                <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                                Pedagogy Course Architect • Step {currentStep} of 5
                            </span>
                            <span className="text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                {lastSavedTime ? `Auto-saved ${lastSavedTime}` : 'Auto-save active'}
                            </span>
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                            {STEP_TITLES[currentStep - 1].title}
                        </h2>
                    </div>

                    {/* Step indicator pills */}
                    <div className="flex items-center gap-2">
                        {STEP_TITLES.map(s => (
                            <button
                                key={s.step}
                                onClick={() => setCurrentStep(s.step)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                    currentStep === s.step
                                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                                        : s.step < currentStep
                                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                                }`}
                            >
                                <span>{s.step}</span>
                                <span className="hidden md:inline">{s.title.split(' ')[0]}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Draft Recovery Banner */}
                {hasSavedDraft && (
                    <div className="px-6 py-2.5 bg-amber-500/10 border-b border-amber-500/20 text-amber-900 dark:text-amber-200 text-xs flex items-center justify-between">
                        <span className="font-semibold flex items-center gap-1.5">
                            💾 An unsaved course blueprint draft was found in local storage.
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleRestoreDraft}
                                className="px-2.5 py-1 bg-amber-600 text-white hover:bg-amber-500 font-bold rounded-lg text-[11px] shadow transition"
                            >
                                Restore Draft
                            </button>
                            <button
                                onClick={handleDiscardDraft}
                                className="px-2 py-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 text-[11px] font-medium"
                            >
                                Discard
                            </button>
                        </div>
                    </div>
                )}

                {/* Main Step Body */}
                <div className="flex-1 overflow-y-auto p-6">
                    
                    {/* ========================================================= */}
                    {/* STEP 1: BLUEPRINT & META                                  */}
                    {/* ========================================================= */}
                    {currentStep === 1 && (
                        <div className="space-y-5 max-w-3xl mx-auto">
                            <div className="bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
                                        <Sparkles className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-indigo-900 dark:text-indigo-200">AI Syllabus & Blueprint Generator</h4>
                                        <p className="text-xs text-indigo-700/80 dark:text-indigo-300/80">Generate complete module metadata, units, and learning objectives automatically.</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => { setAiCopilotTab('outline'); setShowAiCopilot(true); }}
                                    className="btn bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2 px-4 rounded-xl shrink-0 flex items-center gap-1.5"
                                >
                                    <Sparkles className="w-3.5 h-3.5" /> AI Generate
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Course Title (English) *</label>
                                    <input
                                        type="text"
                                        className="input"
                                        placeholder="e.g. Python Object-Oriented Architecture"
                                        value={moduleForm.title}
                                        onChange={e => setModuleForm(f => ({ ...f, title: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <label className="label">Course Title (Hindi / Bilingual)</label>
                                    <input
                                        type="text"
                                        className="input"
                                        placeholder="e.g. पायथन ऑब्जेक्ट-ओरिएंटेड प्रोग्रामिंग"
                                        value={moduleForm.titleHindi}
                                        onChange={e => setModuleForm(f => ({ ...f, titleHindi: e.target.value }))}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="label">Course Description & Outcomes</label>
                                <textarea
                                    className="input h-24"
                                    placeholder="Explain the pedagogical objectives and concepts students will master..."
                                    value={moduleForm.description}
                                    onChange={e => setModuleForm(f => ({ ...f, description: e.target.value }))}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="label">Language Sandbox Engine</label>
                                    <select
                                        className="input"
                                        value={moduleForm.language}
                                        onChange={e => setModuleForm(f => ({ ...f, language: e.target.value }))}
                                    >
                                        <option value="python">Python (Local / Wandbox API)</option>
                                        <option value="html">HTML5 / CSS (Live Render)</option>
                                        <option value="javascript">JavaScript (NodeJS)</option>
                                        <option value="sql">SQL Query Arena</option>
                                        <option value="cpp">C++ (GCC Compiler)</option>
                                        <option value="java">Java (OpenJDK)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="label">Curriculum / Board</label>
                                    <input
                                        type="text"
                                        className="input"
                                        placeholder="PSEB / CBSE / College"
                                        value={moduleForm.boardAligned}
                                        onChange={e => setModuleForm(f => ({ ...f, boardAligned: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <label className="label">Target Class Level</label>
                                    <input
                                        type="number"
                                        className="input"
                                        value={moduleForm.classLevel}
                                        onChange={e => setModuleForm(f => ({ ...f, classLevel: parseInt(e.target.value) || 11 }))}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ========================================================= */}
                    {/* STEP 2: UNITS & MASTERY GATES                             */}
                    {/* ========================================================= */}
                    {currentStep === 2 && (
                        <div className="space-y-4 max-w-4xl mx-auto">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Curriculum Units Hierarchy</h3>
                                    <p className="text-xs text-slate-500">Each unit acts as a progressive learning milestone with a mastery unlock threshold.</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => { setAiCopilotTab('outline'); setShowAiCopilot(true); }}
                                        className="btn btn-secondary text-xs flex items-center gap-1.5"
                                    >
                                        <Sparkles className="w-3.5 h-3.5 text-indigo-500" /> AI Outliner
                                    </button>
                                    <button
                                        onClick={handleAddUnit}
                                        className="btn btn-primary text-xs flex items-center gap-1.5"
                                    >
                                        <Plus className="w-3.5 h-3.5" /> Add Unit
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {units.map((unit, idx) => (
                                    <div
                                        key={unit.id || idx}
                                        className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3"
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-bold text-sm flex items-center justify-center shrink-0">
                                                    {idx + 1}
                                                </div>
                                                <input
                                                    type="text"
                                                    value={unit.title}
                                                    onChange={e => handleUpdateUnit(idx, 'title', e.target.value)}
                                                    className="input font-bold text-sm"
                                                    placeholder="Unit Title..."
                                                />
                                            </div>

                                            <button
                                                onClick={() => handleRemoveUnit(idx)}
                                                className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>

                                        <div>
                                            <input
                                                type="text"
                                                value={unit.description || ''}
                                                onChange={e => handleUpdateUnit(idx, 'description', e.target.value)}
                                                className="input text-xs"
                                                placeholder="Unit description & learning milestones..."
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 pt-1">
                                            <div className="flex items-center gap-2">
                                                <Clock className="w-4 h-4 text-slate-400" />
                                                <span className="text-xs text-slate-600 dark:text-slate-400">Est. Hours:</span>
                                                <input
                                                    type="number"
                                                    value={unit.expectedHours || 4}
                                                    onChange={e => handleUpdateUnit(idx, 'expectedHours', parseInt(e.target.value) || 4)}
                                                    className="input w-20 text-xs py-1"
                                                />
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Lock className="w-4 h-4 text-emerald-500" />
                                                <span className="text-xs text-slate-600 dark:text-slate-400">Unlock Gate %:</span>
                                                <input
                                                    type="number"
                                                    value={unit.unlockThreshold || 80}
                                                    onChange={e => handleUpdateUnit(idx, 'unlockThreshold', parseInt(e.target.value) || 80)}
                                                    className="input w-20 text-xs py-1 font-bold text-emerald-600"
                                                />
                                            </div>
                                        </div>

                                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenWizardTheory(idx)}
                                                    className={`btn text-xs py-1.5 px-3 rounded-xl flex items-center gap-1.5 font-bold transition ${
                                                        unit.theoryData?.content
                                                            ? 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                                                            : 'bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300'
                                                    }`}
                                                >
                                                    <BookOpen className="w-3.5 h-3.5" />
                                                    {unit.theoryData?.content ? '📖 Theory & Checkpoints Set' : '📖 Pre-Lab Theory & Checks'}
                                                </button>
                                                {unit.theoryData?.miniCheckpoints?.length > 0 && (
                                                    <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full font-semibold">
                                                        {unit.theoryData.miniCheckpoints.length} checks
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-[11px] text-slate-400">
                                                {unit.exercises?.length || 0} exercises configured
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ========================================================= */}
                    {/* STEP 3: EXERCISES ARENA                                   */}
                    {/* ========================================================= */}
                    {currentStep === 3 && (
                        <div className="space-y-4 max-w-5xl mx-auto">
                            {/* Unit selector pills */}
                            <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200 dark:border-slate-800">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0">Select Unit:</span>
                                {units.map((u, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setSelectedUnitIdx(i)}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                                            selectedUnitIdx === i
                                                ? 'bg-indigo-600 text-white shadow-sm'
                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                                        }`}
                                    >
                                        <span>Unit {i + 1}</span>
                                        <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded-full">
                                            {u.exercises?.length || 0}
                                        </span>
                                    </button>
                                ))}
                            </div>

                            {/* Active Unit Exercises List */}
                            {units[selectedUnitIdx] && (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                                                {units[selectedUnitIdx].title} Exercises
                                            </h4>
                                            <p className="text-xs text-slate-500">
                                                Add all 5 question types: Coding Labs, MCQs, Syntax Cloze, Bug Hunts, and Case Studies.
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => { setAiCopilotTab('exercise'); setShowAiCopilot(true); }}
                                                className="btn bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 text-white text-xs py-2 px-3 rounded-xl flex items-center gap-1.5 font-bold shadow-sm"
                                            >
                                                <Sparkles className="w-3.5 h-3.5" /> AI Synthesize Exercise
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setEditingExerciseIdx(null);
                                                    setExerciseForm(f => ({ ...f, title: '', description: '', theory: '' }));
                                                    setShowExerciseFormModal(true);
                                                }}
                                                className="btn btn-primary text-xs py-2 px-3 rounded-xl flex items-center gap-1.5 font-bold"
                                            >
                                                <Plus className="w-3.5 h-3.5" /> + Add Exercise
                                            </button>
                                        </div>
                                    </div>

                                    {/* Exercise Cards */}
                                    {(!units[selectedUnitIdx].exercises || units[selectedUnitIdx].exercises.length === 0) ? (
                                        <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                                            <Code2 className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                                            <h5 className="font-bold text-sm text-slate-700 dark:text-slate-300">No Exercises in this Unit Yet</h5>
                                            <p className="text-xs text-slate-400 mt-1">Use the buttons above to manually add an exercise or generate one with AI.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {units[selectedUnitIdx].exercises.map((ex, exIdx) => {
                                                const typeBadges = {
                                                    coding: { label: '⚡ Coding Lab', bg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' },
                                                    mcq: { label: '📝 Output MCQ', bg: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' },
                                                    fill_blank: { label: '🧩 Syntax Cloze', bg: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300' },
                                                    bug_fix: { label: '🐞 Bug Hunt', bg: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' },
                                                    case_study: { label: '🏢 Case Study', bg: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' },
                                                    assertion_reason: { label: '⚖️ Assertion-Reason', bg: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300' },
                                                    code_trace: { label: '🔍 Dry-Run Trace', bg: 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300' },
                                                    code_debug: { label: '🐞 CBSE Error Debug', bg: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300' },
                                                };
                                                const badge = typeBadges[ex.exerciseType] || typeBadges.coding;

                                                return (
                                                    <div
                                                        key={exIdx}
                                                        onClick={() => handleOpenEditExercise(exIdx)}
                                                        className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-4 shadow-sm cursor-pointer transition group"
                                                    >
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <span className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold flex items-center justify-center shrink-0">
                                                                {exIdx + 1}
                                                            </span>
                                                            <div className="min-w-0">
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <h5 className="font-bold text-sm text-slate-900 dark:text-white truncate group-hover:text-indigo-600 transition">
                                                                        {ex.title}
                                                                    </h5>
                                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.bg}`}>
                                                                        {badge.label}
                                                                    </span>
                                                                    <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded capitalize">
                                                                        {ex.scaffoldLevel}
                                                                    </span>
                                                                </div>
                                                                <p className="text-xs text-slate-400 truncate mt-0.5">
                                                                    {ex.description}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-2 shrink-0">
                                                            <span className="text-xs font-bold text-amber-500 flex items-center gap-1 mr-1">
                                                                <Award className="w-3.5 h-3.5" /> +{ex.xpReward || 15} XP
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleOpenEditExercise(exIdx);
                                                                }}
                                                                className="btn btn-secondary text-xs py-1 px-2.5 rounded-lg flex items-center gap-1 font-semibold"
                                                            >
                                                                <Edit3 className="w-3.5 h-3.5" /> Edit
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleRemoveExercise(exIdx);
                                                                }}
                                                                className="p-1.5 text-slate-400 hover:text-red-500 transition rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                                                title="Delete Exercise"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ========================================================= */}
                    {/* STEP 4: PEDAGOGY RULES & GAMIFICATION                     */}
                    {/* ========================================================= */}
                    {currentStep === 4 && (
                        <div className="space-y-6 max-w-3xl mx-auto">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                                {/* Pedagogy Score Gauge */}
                                <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-center space-y-3">
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                        Calculated Pedagogy Score
                                    </span>
                                    <div className="text-4xl font-extrabold text-indigo-600 dark:text-indigo-400">
                                        {pedagogyStats.score}<span className="text-base font-medium text-slate-400">/100</span>
                                    </div>
                                    <p className="text-xs text-slate-500">
                                        {pedagogyStats.score >= 80 ? '🌟 Excellent! Strong pedagogical scaffolding and diversity.' : '💡 Add diverse question types & review exercises to boost score.'}
                                    </p>
                                </div>

                                {/* Active Config Toggles */}
                                <div className="space-y-3">
                                    <label className="flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={moduleForm.pedagogyConfig.useBlooms}
                                            onChange={e => setModuleForm(f => ({
                                                ...f,
                                                pedagogyConfig: { ...f.pedagogyConfig, useBlooms: e.target.checked }
                                            }))}
                                            className="rounded text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <div>
                                            <div className="font-bold text-xs text-slate-900 dark:text-white">Bloom's Taxonomy Cognitive Levels</div>
                                            <div className="text-[11px] text-slate-500">Tag exercises with cognitive complexity.</div>
                                        </div>
                                    </label>

                                    <label className="flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={moduleForm.pedagogyConfig.useObjectives}
                                            onChange={e => setModuleForm(f => ({
                                                ...f,
                                                pedagogyConfig: { ...f.pedagogyConfig, useObjectives: e.target.checked }
                                            }))}
                                            className="rounded text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <div>
                                            <div className="font-bold text-xs text-slate-900 dark:text-white">Explicit Learning Objectives</div>
                                            <div className="text-[11px] text-slate-500">Declare SWBAT goals per exercise.</div>
                                        </div>
                                    </label>

                                    <label className="flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={moduleForm.pedagogyConfig.useTimeLimit}
                                            onChange={e => setModuleForm(f => ({
                                                ...f,
                                                pedagogyConfig: { ...f.pedagogyConfig, useTimeLimit: e.target.checked }
                                            }))}
                                            className="rounded text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <div>
                                            <div className="font-bold text-xs text-slate-900 dark:text-white">Time-Boxed Practice</div>
                                            <div className="text-[11px] text-slate-500">Enforce speed-challenge timers.</div>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ========================================================= */}
                    {/* STEP 5: DEPLOY & ASSIGN                                   */}
                    {/* ========================================================= */}
                    {currentStep === 5 && (
                        <div className="space-y-5 max-w-3xl mx-auto">
                            <div className="p-4 bg-indigo-50 dark:bg-indigo-950/40 rounded-2xl border border-indigo-200 dark:border-indigo-900">
                                <h4 className="font-bold text-sm text-indigo-900 dark:text-indigo-200">Course Summary</h4>
                                <div className="grid grid-cols-3 gap-2 mt-2 text-xs text-indigo-800 dark:text-indigo-300">
                                    <div><strong>Title:</strong> {moduleForm.title || 'Untitled'}</div>
                                    <div><strong>Language:</strong> {moduleForm.language}</div>
                                    <div><strong>Units:</strong> {units.length}</div>
                                    <div><strong>Total Exercises:</strong> {pedagogyStats.totalExercises}</div>
                                    <div><strong>Class:</strong> {moduleForm.classLevel}</div>
                                    <div><strong>Board:</strong> {moduleForm.boardAligned}</div>
                                </div>
                            </div>

                            {/* Class Assignment Selector */}
                            <div>
                                <label className="label flex items-center gap-1.5">
                                    <Users className="w-4 h-4 text-indigo-500" /> Assign to Classes (Optional)
                                </label>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-1">
                                    {availableClasses.map(cls => (
                                        <label
                                            key={cls.id}
                                            className={`p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition flex items-center gap-2 ${
                                                targetClasses.includes(cls.id)
                                                    ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-700 dark:text-indigo-300'
                                                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={targetClasses.includes(cls.id)}
                                                onChange={e => {
                                                    if (e.target.checked) setTargetClasses(prev => [...prev, cls.id]);
                                                    else setTargetClasses(prev => prev.filter(c => c !== cls.id));
                                                }}
                                                className="rounded text-indigo-600"
                                            />
                                            <span className="truncate">{cls.name}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="label flex items-center gap-1.5">
                                        <Calendar className="w-4 h-4 text-amber-500" /> Deadline (Optional)
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={deadline}
                                        onChange={e => setDeadline(e.target.value)}
                                        className="input"
                                    />
                                </div>
                                <div>
                                    <label className="label">Special Instructions</label>
                                    <input
                                        type="text"
                                        value={specialNotes}
                                        onChange={e => setSpecialNotes(e.target.value)}
                                        placeholder="e.g. Complete Unit 1 by Friday"
                                        className="input"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Navigation Bar */}
                <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between px-6">
                    <div>
                        {currentStep > 1 && (
                            <button
                                onClick={() => setCurrentStep(prev => prev - 1)}
                                className="btn btn-secondary text-xs flex items-center gap-1.5 font-bold"
                            >
                                <ArrowLeft className="w-4 h-4" /> Back
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        <button onClick={onClose} className="btn btn-secondary text-xs font-bold">
                            Cancel
                        </button>

                        {currentStep < 5 ? (
                            <button
                                onClick={() => setCurrentStep(prev => prev + 1)}
                                className="btn btn-primary text-xs flex items-center gap-1.5 font-bold"
                            >
                                Next Step <ArrowRight className="w-4 h-4" />
                            </button>
                        ) : (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleFinalDeploy(false)}
                                    disabled={isSubmitting}
                                    className="btn btn-secondary text-xs font-bold"
                                >
                                    Save as Draft
                                </button>
                                <button
                                    onClick={() => handleFinalDeploy(true)}
                                    disabled={isSubmitting}
                                    className="btn bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 text-white text-xs font-bold py-2.5 px-6 rounded-xl shadow-lg shadow-indigo-500/25 flex items-center gap-2"
                                >
                                    {isSubmitting ? 'Deploying Course...' : '🚀 Publish & Enter Builder'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Exercise Builder Modal (All 5 Question Types) */}
            {showExerciseFormModal && (
                <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center z-[110] p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-4xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden">
                        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                            <h3 className="font-bold text-base text-slate-900 dark:text-white">
                                {editingExerciseIdx !== null ? 'Edit Exercise' : 'Add Exercise to Unit'}
                            </h3>
                            <button onClick={() => setShowExerciseFormModal(false)} className="p-1.5 text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-4">
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
                                            value={wizardInlineAiProvider}
                                            onChange={e => setWizardInlineAiProvider(e.target.value)}
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
                                        value={wizardInlineAiPrompt}
                                        onChange={e => setWizardInlineAiPrompt(e.target.value)}
                                        placeholder={`Enter topic or concept (e.g. 'Dry-Run trace loop' or 'Assertion on immutability')...`}
                                        className="input text-xs flex-1 py-2 bg-white dark:bg-slate-900 border-indigo-200 dark:border-indigo-800"
                                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleInlineAiGenerateExerciseInWizard(); } }}
                                    />
                                    <button
                                        type="button"
                                        disabled={wizardInlineAiLoading || !wizardInlineAiPrompt.trim()}
                                        onClick={handleInlineAiGenerateExerciseInWizard}
                                        className="btn bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2 px-4 rounded-xl shrink-0 flex items-center gap-1.5 shadow-md shadow-indigo-600/20 disabled:opacity-50 transition"
                                    >
                                        {wizardInlineAiLoading ? (
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
                                    Auto-fills Title, Problem Statement, Solution, and test data directly into this form without modal switching.
                                </p>
                            </div>

                            {/* Exercise Type Picker */}
                            <div>
                                <label className="label">Question / Challenge Type</label>
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
                                            className={`p-2 rounded-xl text-xs font-bold border transition ${
                                                exerciseForm.exerciseType === t.id
                                                    ? 'bg-indigo-600 text-white border-indigo-600'
                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-transparent'
                                            }`}
                                        >
                                            {t.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Problem Title *</label>
                                    <input
                                        type="text"
                                        value={exerciseForm.title}
                                        onChange={e => setExerciseForm(f => ({ ...f, title: e.target.value }))}
                                        className="input"
                                        placeholder="e.g. Find Max In Array"
                                    />
                                </div>
                                <div>
                                    <label className="label">XP Reward</label>
                                    <input
                                        type="number"
                                        value={exerciseForm.xpReward}
                                        onChange={e => setExerciseForm(f => ({ ...f, xpReward: parseInt(e.target.value) || 15 }))}
                                        className="input font-bold text-amber-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="label">Learning Theory / Lesson Content</label>
                                <textarea
                                    value={exerciseForm.theory}
                                    onChange={e => setExerciseForm(f => ({ ...f, theory: e.target.value }))}
                                    placeholder="Explain the concept before the student attempts the problem..."
                                    className="input h-20 text-xs font-mono"
                                />
                            </div>

                            <div>
                                <label className="label">Problem Statement / Prompt</label>
                                <textarea
                                    value={exerciseForm.description}
                                    onChange={e => setExerciseForm(f => ({ ...f, description: e.target.value }))}
                                    placeholder="Problem statement instructions..."
                                    className="input h-20 text-xs"
                                />
                            </div>

                            {/* Specific Editors for each Exercise Type */}
                            {exerciseForm.exerciseType === 'mcq' && (
                                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                                    <h4 className="text-xs font-bold uppercase text-amber-600 flex items-center gap-1.5">
                                        <CheckSquare className="w-4 h-4" /> MCQ Configuration
                                    </h4>
                                    <div>
                                        <label className="text-xs font-semibold">Target Code Snippet to Trace:</label>
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
                                        <label className="text-xs font-semibold">Multiple Choice Options (Select correct option):</label>
                                        {exerciseForm.mcqData.options.map((opt, oi) => (
                                            <div key={oi} className="flex items-center gap-2">
                                                <input
                                                    type="radio"
                                                    name="correct_mcq_opt"
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

                            {(exerciseForm.exerciseType === 'coding' || exerciseForm.exerciseType === 'bug_fix') && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="label">Starter Code</label>
                                        <textarea
                                            value={exerciseForm.starterCode}
                                            onChange={e => setExerciseForm(f => ({ ...f, starterCode: e.target.value }))}
                                            className="w-full h-28 bg-slate-950 text-emerald-400 font-mono text-xs p-3 rounded-2xl border border-slate-700"
                                        />
                                    </div>
                                    <div>
                                        <label className="label">Solution Code</label>
                                        <textarea
                                            value={exerciseForm.solutionCode}
                                            onChange={e => setExerciseForm(f => ({ ...f, solutionCode: e.target.value }))}
                                            className="w-full h-28 bg-slate-950 text-blue-400 font-mono text-xs p-3 rounded-2xl border border-slate-700"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Assertion-Reason Sub-Form */}
                            {exerciseForm.exerciseType === 'assertion_reason' && (
                                <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-2xl border border-indigo-200 dark:border-indigo-800/60 space-y-3">
                                    <h4 className="text-xs font-bold uppercase text-indigo-600 flex items-center gap-1.5">
                                        ⚖️ CBSE Assertion-Reason Configuration
                                    </h4>
                                    <div>
                                        <label className="text-xs font-semibold">Assertion Statement (A):</label>
                                        <textarea
                                            value={exerciseForm.arData?.assertion || ''}
                                            onChange={e => setExerciseForm(f => ({
                                                ...f,
                                                arData: { ...f.arData, assertion: e.target.value }
                                            }))}
                                            className="input h-16 text-xs mt-1"
                                            placeholder="Statement A to be evaluated..."
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold">Reason Statement (R):</label>
                                        <textarea
                                            value={exerciseForm.arData?.reason || ''}
                                            onChange={e => setExerciseForm(f => ({
                                                ...f,
                                                arData: { ...f.arData, reason: e.target.value }
                                            }))}
                                            className="input h-16 text-xs mt-1"
                                            placeholder="Reason R to explain or support A..."
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold block mb-1.5">Correct Relationship Option:</label>
                                        {[
                                            'Both A and R are true and R is the correct explanation of A',
                                            'Both A and R are true but R is NOT the correct explanation of A',
                                            'A is true but R is false',
                                            'A is false but R is true'
                                        ].map((opt, oi) => (
                                            <label key={oi} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 py-1 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="wizardArCorrect"
                                                    checked={exerciseForm.arData?.correctOption === oi}
                                                    onChange={() => setExerciseForm(f => ({
                                                        ...f,
                                                        arData: { ...f.arData, correctOption: oi }
                                                    }))}
                                                />
                                                <span>Option {String.fromCharCode(65 + oi)}: {opt}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Dry-Run Trace Sub-Form */}
                            {exerciseForm.exerciseType === 'code_trace' && (
                                <div className="p-4 bg-teal-50/50 dark:bg-teal-950/20 rounded-2xl border border-teal-200 dark:border-teal-800/60 space-y-3">
                                    <h4 className="text-xs font-bold uppercase text-teal-600 flex items-center gap-1.5">
                                        🔍 Dry-Run Trace Table Configuration
                                    </h4>
                                    <div>
                                        <label className="text-xs font-semibold">Code Snippet to Trace:</label>
                                        <textarea
                                            value={exerciseForm.traceData?.codeSnippet || ''}
                                            onChange={e => setExerciseForm(f => ({
                                                ...f,
                                                traceData: { ...f.traceData, codeSnippet: e.target.value }
                                            }))}
                                            className="input font-mono text-xs h-24 mt-1"
                                            placeholder="for i in range(1, 4): ..."
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold">Table Headers (comma-separated):</label>
                                        <input
                                            type="text"
                                            value={(exerciseForm.traceData?.tableHeaders || []).join(', ')}
                                            onChange={e => {
                                                const headers = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                                                setExerciseForm(f => ({
                                                    ...f,
                                                    traceData: { ...f.traceData, tableHeaders: headers }
                                                }));
                                            }}
                                            className="input text-xs mt-1"
                                            placeholder="Step (i), Value of a, Value of b"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* CBSE Code Debug Sub-Form */}
                            {exerciseForm.exerciseType === 'code_debug' && (
                                <div className="p-4 bg-red-50/50 dark:bg-red-950/20 rounded-2xl border border-red-200 dark:border-red-800/60 space-y-3">
                                    <h4 className="text-xs font-bold uppercase text-red-600 flex items-center gap-1.5">
                                        🐞 CBSE Code Debugging Configuration
                                    </h4>
                                    <div>
                                        <label className="text-xs font-semibold">Buggy Code Given to Student:</label>
                                        <textarea
                                            value={exerciseForm.debugData?.buggyCode || ''}
                                            onChange={e => setExerciseForm(f => ({
                                                ...f,
                                                debugData: { ...f.debugData, buggyCode: e.target.value },
                                                starterCode: e.target.value
                                            }))}
                                            className="input font-mono text-xs h-24 mt-1"
                                            placeholder="def total(a, b)\n  return a + b"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold">Corrected Solution Code:</label>
                                        <textarea
                                            value={exerciseForm.debugData?.solutionCode || ''}
                                            onChange={e => setExerciseForm(f => ({
                                                ...f,
                                                debugData: { ...f.debugData, solutionCode: e.target.value },
                                                solutionCode: e.target.value
                                            }))}
                                            className="input font-mono text-xs h-24 mt-1"
                                            placeholder="def total(a, b):\n  return a + b"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-end gap-3">
                            <button onClick={() => setShowExerciseFormModal(false)} className="btn btn-secondary text-xs">
                                Cancel
                            </button>
                            <button onClick={handleSaveExercise} className="btn btn-primary text-xs font-bold">
                                Save Exercise to Unit
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Wizard Unit Pre-Lab Theory Modal */}
            {showWizardTheoryModal && (
                <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center z-[120] p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden">
                        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                                    <BookOpen className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                        Pre-Lab Theory & Interactive Checkpoints
                                    </h3>
                                    <p className="text-xs text-slate-500">
                                        {wizardTheoryForm.title} • CBSE Concept Grounding
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setShowWizardTheoryModal(false)} className="p-1.5 text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-4 flex-1">
                            {/* Inline AI Theory Synthesizer Bar */}
                            <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-transparent p-4 rounded-2xl border border-indigo-200 dark:border-indigo-800/80 space-y-2.5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 dark:text-indigo-300">
                                        <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
                                        <span>AI Pre-Lab Notes & Checkpoints Synthesizer</span>
                                    </div>
                                    <span className="text-[10px] text-slate-500 font-medium">Auto-fills Markdown & Checkpoints</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={wizardInlineAiTheoryPrompt}
                                        onChange={e => setWizardInlineAiTheoryPrompt(e.target.value)}
                                        placeholder={`Enter unit concept (e.g. '${wizardTheoryForm.title}')...`}
                                        className="input text-xs flex-1 py-2 bg-white dark:bg-slate-900 border-indigo-200 dark:border-indigo-800"
                                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleInlineAiGenerateTheoryInWizard(); } }}
                                    />
                                    <button
                                        type="button"
                                        disabled={wizardInlineAiTheoryLoading}
                                        onClick={handleInlineAiGenerateTheoryInWizard}
                                        className="btn bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2 px-4 rounded-xl shrink-0 flex items-center gap-1.5 shadow-md shadow-indigo-600/20 disabled:opacity-50 transition"
                                    >
                                        {wizardInlineAiTheoryLoading ? (
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
                                <label className="label">Unit Concept Summary</label>
                                <input
                                    type="text"
                                    value={wizardTheoryForm.summary}
                                    onChange={e => setWizardTheoryForm(f => ({ ...f, summary: e.target.value }))}
                                    className="input text-xs"
                                    placeholder="Brief core concept takeaway..."
                                />
                            </div>

                            <div>
                                <label className="label">Full Concept Notes & Theory (Markdown)</label>
                                <textarea
                                    value={wizardTheoryForm.content}
                                    onChange={e => setWizardTheoryForm(f => ({ ...f, content: e.target.value }))}
                                    className="input h-36 font-mono text-xs"
                                    placeholder="## Concept Overview&#10;&#10;Explain syntax, execution model, and edge cases..."
                                />
                            </div>

                            {/* Mini Checkpoints */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                                        Interactive Mini-Checkpoints ({wizardTheoryForm.miniCheckpoints?.length || 0})
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setWizardTheoryForm(f => ({
                                            ...f,
                                            miniCheckpoints: [
                                                ...(f.miniCheckpoints || []),
                                                {
                                                    id: `cp_${Date.now()}`,
                                                    question: '',
                                                    options: ['', ''],
                                                    correctOption: 0,
                                                    explanation: ''
                                                }
                                            ]
                                        }))}
                                        className="btn btn-secondary text-xs py-1 px-2.5 rounded-lg flex items-center gap-1 font-semibold"
                                    >
                                        <Plus className="w-3.5 h-3.5" /> Add Checkpoint
                                    </button>
                                </div>

                                {(wizardTheoryForm.miniCheckpoints || []).map((cp, cIdx) => (
                                    <div key={cp.id || cIdx} className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                                                Checkpoint #{cIdx + 1}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => setWizardTheoryForm(f => ({
                                                    ...f,
                                                    miniCheckpoints: f.miniCheckpoints.filter((_, i) => i !== cIdx)
                                                }))}
                                                className="text-rose-500 hover:text-rose-600 p-1"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                        <input
                                            type="text"
                                            value={cp.question}
                                            onChange={e => {
                                                const val = e.target.value;
                                                setWizardTheoryForm(f => {
                                                    const cps = [...f.miniCheckpoints];
                                                    cps[cIdx] = { ...cps[cIdx], question: val };
                                                    return { ...f, miniCheckpoints: cps };
                                                });
                                            }}
                                            placeholder="Quick comprehension check question..."
                                            className="input text-xs"
                                        />
                                        <div className="grid grid-cols-2 gap-2">
                                            {(cp.options || []).map((opt, oIdx) => (
                                                <div key={oIdx} className="flex items-center gap-1.5">
                                                    <input
                                                        type="radio"
                                                        name={`wiz_cp_${cIdx}`}
                                                        checked={cp.correctOption === oIdx}
                                                        onChange={() => setWizardTheoryForm(f => {
                                                            const cps = [...f.miniCheckpoints];
                                                            cps[cIdx] = { ...cps[cIdx], correctOption: oIdx };
                                                            return { ...f, miniCheckpoints: cps };
                                                        })}
                                                    />
                                                    <input
                                                        type="text"
                                                        value={opt}
                                                        onChange={e => {
                                                            const val = e.target.value;
                                                            setWizardTheoryForm(f => {
                                                                const cps = [...f.miniCheckpoints];
                                                                const opts = [...cps[cIdx].options];
                                                                opts[oIdx] = val;
                                                                cps[cIdx] = { ...cps[cIdx], options: opts };
                                                                return { ...f, miniCheckpoints: cps };
                                                            });
                                                        }}
                                                        placeholder={`Option ${oIdx + 1}`}
                                                        className="input text-xs py-1 flex-1"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-end gap-3">
                            <button onClick={() => setShowWizardTheoryModal(false)} className="btn btn-secondary text-xs">
                                Cancel
                            </button>
                            <button onClick={handleSaveWizardTheory} className="btn btn-primary text-xs font-bold">
                                Save Pre-Lab Theory
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* AI LMS Copilot Drawer */}
            <AiTrainingCopilot
                isOpen={showAiCopilot}
                onClose={() => setShowAiCopilot(false)}
                activeTab={aiCopilotTab}
                onInsertOutline={handleApplyAiOutline}
                onInsertExercise={handleApplyAiExercise}
                context={{
                    language: moduleForm.language,
                    classLevel: moduleForm.classLevel,
                    board: moduleForm.boardAligned,
                    unitTitle: units[selectedUnitIdx]?.title,
                    unitDescription: units[selectedUnitIdx]?.description || '',
                    moduleTitle: moduleForm.title || '',
                    topic: currentStep === 1
                        ? (moduleForm.title || moduleForm.description)
                        : currentStep === 2
                        ? (units[selectedUnitIdx]?.title || moduleForm.title)
                        : (exerciseForm.title || units[selectedUnitIdx]?.title || moduleForm.title),
                    exerciseType: exerciseForm.exerciseType,
                    difficulty: exerciseForm.difficulty,
                    scaffoldLevel: exerciseForm.scaffoldLevel,
                    bloomsLevel: exerciseForm.bloomsLevel
                }}
            />
        </div>
    );
}
